import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/lib/tokenizer'
import { assemble } from '../src/lib/assembler'
import { splitTemplate } from '../src/lib/segments'
import type { ParsedComponent } from '../src/lib/types'

const parse = (s: string) => tokenize(s, 'seg')

function asm(s: string, values: Record<string, string> = {}) {
  const p = tokenize(s, 'seg')
  const comp = {
    id: 'seg', title: 'seg', category: '', modes: [], sourcePath: '',
    bodyTemplate: p.bodyTemplate, fields: p.fields, flags: p.flags,
    includes: p.includes, smartlinks: p.smartlinks, tags: [], rawBody: '', warnings: p.warnings,
  } as ParsedComponent
  return assemble(comp, values).text
}

describe('tokenizer — kind-based labels + sentence context', () => {
  it('labels are clean kind defaults, not preceding prose', () => {
    const { fields } = parse(
      'Attention was directed to the [R/L] [maxillary/mandibular] vestibule. Tooth [#__] was delivered.',
    )
    const labels = fields.map((f) => f.label)
    // Old heuristic produced "Attention was directed to the" etc.; new labels are kind-based.
    expect(labels).not.toContain('Attention was directed to the')
    expect(fields.find((f) => f.kind === 'side')?.label).toBe('Side')
    expect(fields.find((f) => f.kind === 'toothNumber')?.label).toBe('Tooth #')
  })

  it('measurement label carries its unit', () => {
    const { fields } = parse('A graft measuring [X] mm was harvested.')
    expect(fields.find((f) => f.kind === 'measurement')?.label).toBe('Measurement (mm)')
  })

  it('context is the containing sentence with this placeholder shown as a blank', () => {
    const { fields } = parse('Tooth [#__] was tested for profound anesthesia.')
    expect(fields[0].context).toBe('Tooth ___ was tested for profound anesthesia.')
  })

  it('sibling placeholders stay raw in the context so the asked blank is unambiguous', () => {
    const { fields } = parse('Attention was directed to the [R/L] [maxillary/mandibular] vestibule.')
    const side = fields.find((f) => f.kind === 'side')!
    expect(side.context).toBe('Attention was directed to the ___ [maxillary/mandibular] vestibule.')
  })
})

describe('splitTemplate — prose ↔ field interleaving', () => {
  it('round-trips text + fields in source order with no content loss', () => {
    const { bodyTemplate, fields } = parse('Tooth [#__] was luxated and delivered with forceps.')
    const segs = splitTemplate(bodyTemplate, fields)
    expect(segs[0]).toMatchObject({ type: 'text', text: 'Tooth ' })
    expect(segs[1]).toMatchObject({ type: 'field' })
    expect(segs[2]).toMatchObject({ type: 'text', text: ' was luxated and delivered with forceps.' })
    // Reconstructing text + raw recovers the original sentence.
    const recon = segs
      .map((s) => (s.type === 'text' ? s.text : s.type === 'field' ? '[#__]' : ''))
      .join('')
    expect(recon).toBe('Tooth [#__] was luxated and delivered with forceps.')
  })

  it('strips the leading PROCEDURE: line (named by the block header elsewhere)', () => {
    const { bodyTemplate, fields } = parse('PROCEDURE: Simple extraction\n\nTooth [#__] was delivered.')
    const segs = splitTemplate(bodyTemplate, fields)
    const firstText = segs.find((s) => s.type === 'text') as { type: 'text'; text: string }
    expect(firstText.text).not.toMatch(/PROCEDURE:/)
  })

  it('surfaces includes as their own segment kind', () => {
    const { bodyTemplate, fields } = parse('Closing per .sacsign protocol.')
    const segs = splitTemplate(bodyTemplate, fields)
    expect(segs.some((s) => s.type === 'include' && s.dotPhrase === '.sacsign')).toBe(true)
  })
})

describe('optionalClause — include / omit / undecided', () => {
  const note = 'Pressure was held. [The site was closed with 3-0 chromic gut suture.] The tooth was delivered.'

  it('a multi-word prose bracket becomes an optionalClause field', () => {
    const f = parse(note).fields.find((x) => x.kind === 'optionalClause')
    expect(f).toBeTruthy()
    expect(f!.context).toBe('The site was closed with 3-0 chromic gut suture.')
  })

  it('undecided keeps the bracketed clause verbatim (zero output change)', () => {
    expect(asm(note)).toContain('[The site was closed with 3-0 chromic gut suture.]')
  })

  it('include strips the brackets; omit removes the clause entirely', () => {
    const f = parse(note).fields.find((x) => x.kind === 'optionalClause')!
    const on = asm(note, { [f.id]: 'on' })
    expect(on).toContain('The site was closed with 3-0 chromic gut suture.')
    expect(on).not.toContain('[The site was closed')
    const omit = asm(note, { [f.id]: 'omit' })
    expect(omit).not.toContain('site was closed')
  })

  it('does not capture slash-choices, nested brackets, or underscore blanks', () => {
    expect(parse('[a / b / c choice here]').fields.some((f) => f.kind === 'optionalClause')).toBe(false)
    expect(parse('[region __ to __]').fields.some((f) => f.kind === 'optionalClause')).toBe(false)
    expect(parse('[outer [#__] inner]').fields.some((f) => f.kind === 'optionalClause')).toBe(false)
  })
})

describe('tokenizer — [TEMPLATE:…] editorial notes are stripped everywhere', () => {
  it('removes a [TEMPLATE: …] marker from the body and does not surface it', () => {
    const { bodyTemplate, flags, fields } = parse(
      'The flap was closed.\n\n[TEMPLATE: atomic snippet adapted from prior notes; review before use.]',
    )
    expect(bodyTemplate).not.toMatch(/TEMPLATE/)
    expect(flags.some((f) => /TEMPLATE/i.test(f.type))).toBe(false)
    expect(fields.length).toBe(0)
  })

  it('still surfaces CONFIRM as a clinical flag (not stripped silently)', () => {
    const { flags } = parse('[CONFIRM: verify the side before incision]')
    expect(flags.some((f) => f.type === 'CONFIRM')).toBe(true)
  })
})

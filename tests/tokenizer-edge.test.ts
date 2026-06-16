import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/lib/tokenizer'
import { assemble } from '../src/lib/assembler'
import { SENTINEL_OPEN, SENTINEL_CLOSE, type ParsedComponent } from '../src/lib/types'

const T = (s: string) => tokenize(s, 'edge')

/** Assemble a tokenizer result directly (default keepRaw policy) to assert on output. */
function assembleParsed(p: ReturnType<typeof tokenize>) {
  const comp = {
    id: 'edge',
    title: 'edge',
    category: '',
    modes: [],
    sourcePath: '',
    bodyTemplate: p.bodyTemplate,
    fields: p.fields,
    flags: p.flags,
    includes: p.includes,
    smartlinks: p.smartlinks,
    tags: [],
    rawBody: '',
    warnings: p.warnings,
  } as ParsedComponent
  return assemble(comp, {})
}

describe('tokenizer — adversarial / silent-loss edge cases', () => {
  it('a stray "[" does not swallow later placeholders (no black hole)', () => {
    const { fields, warnings } = T('Tooth [#__] then a stray [ and then [R/L] side and [X] mm')
    const kinds = fields.map((f) => f.kind)
    expect(kinds).toContain('toothNumber')
    expect(kinds).toContain('side') // would be lost with the old balanced scan
    expect(kinds).toContain('measurement')
    expect(warnings.some((w) => /Unclosed/.test(w))).toBe(true)
  })

  it('recovers from a stray "]" and warns', () => {
    const { fields, warnings } = T('extra ] then [R/L] side')
    expect(fields.some((f) => f.kind === 'side')).toBe(true)
    expect(warnings.some((w) => /Unmatched/.test(w))).toBe(true)
  })

  it('keeps legitimate nesting as one outer span', () => {
    const { fields } = T('[CONFIRM contains [#__] inside]')
    expect(fields.some((f) => f.kind === 'toothNumber')).toBe(false) // inner not separately parsed
  })

  it('does NOT delete bracketed prose that merely starts with a flag word', () => {
    const note = '[Note the patient is allergic to penicillin]'
    const parsed = T(note)
    // Not a strip-flag, and not sentence-shaped (no terminal punctuation) so not an
    // optional clause either -> kept inline verbatim. Never silently deleted.
    expect(parsed.bodyTemplate).toContain('Note the patient is allergic')
    const { text } = assembleParsed(parsed)
    expect(text).toContain('Note the patient is allergic') // preserved in output (no data loss)
  })

  it('still strips a genuine dated reviewer annotation', () => {
    const { bodyTemplate, flags } = T('Body text [Added 2026-06-14 — closing paragraph] more')
    expect(bodyTemplate).not.toContain('Added 2026-06-14')
    expect(flags.some((f) => f.type === 'ADDED')).toBe(true)
  })

  it('treats bare patient identifiers as smartlinks but not "[Provider Name]" / "[Name Of Procedure]"', () => {
    expect(T('[MRN]').smartlinks.length).toBe(1)
    expect(T('[Provider Name]').smartlinks.length).toBe(0)
    expect(T('[Name Of Procedure]').smartlinks.length).toBe(0)
  })

  it('does not turn dates or unit fractions into dropdowns, but keeps numeric clinical choices', () => {
    expect(T('Date [10/12/2024] here').fields.some((f) => f.kind === 'enumText')).toBe(false)
    expect(T('Dose [mg/dL]').fields.some((f) => f.kind === 'enumText')).toBe(false)
    expect(T('Bur [701/702]').fields.some((f) => f.kind === 'enumText')).toBe(true)
    expect(T('Suture [3-0/4-0]').fields.some((f) => f.kind === 'enumText')).toBe(true)
  })

  it('does not parse a markdown link or task checkbox as a field', () => {
    expect(T('See [CDC](https://cdc.gov) guidance').fields.length).toBe(0)
    expect(T('- [x] reviewed\n- [ ] pending').fields.length).toBe(0)
  })

  it('strips reserved sentinel characters from source text', () => {
    const dirty = `before ${SENTINEL_OPEN}x${SENTINEL_CLOSE} after`
    const { bodyTemplate, warnings } = T(dirty)
    expect(bodyTemplate).not.toContain(SENTINEL_OPEN)
    expect(bodyTemplate).not.toContain(SENTINEL_CLOSE)
    expect(warnings.some((w) => /sentinel/i.test(w))).toBe(true)
  })
})

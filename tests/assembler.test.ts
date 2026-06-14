import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tokenize } from '../src/lib/tokenizer'
import { assemble, valueKey } from '../src/lib/assembler'
import type { ParsedComponent } from '../src/lib/types'

function buildComponent(name: string, id: string): ParsedComponent {
  const raw = readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf8')
  const t = tokenize(raw, id)
  return {
    id,
    title: id,
    category: 'test',
    modes: ['library'],
    sourcePath: name,
    bodyTemplate: t.bodyTemplate,
    fields: t.fields,
    flags: t.flags,
    includes: t.includes,
    tags: [],
    rawBody: raw,
    warnings: t.warnings,
  }
}

describe('assembler', () => {
  const comp = buildComponent('orif-symphysis.md', 'sym')

  it('produces plain text with no em-dashes or markdown emphasis', () => {
    const { text } = assemble(comp, {})
    expect(text).not.toMatch(/[—–]/)
    expect(text).not.toMatch(/\*\*/)
  })

  it('leaves unfilled fields as raw placeholders and lists them as missing', () => {
    const { text, missing } = assemble(comp, {})
    expect(missing.length).toBeGreaterThan(0)
    // a tooth-number placeholder remains when unfilled
    expect(text).toContain('[#__]')
  })

  it('substitutes filled values', () => {
    const tooth = comp.fields.find((f) => f.kind === 'toothNumber')!
    const { text } = assemble(comp, { [tooth.id]: '22-27' })
    expect(text).toContain('22-27')
  })

  it('renders linked side fields per token spelling from one canonical value', () => {
    // synthetic: two side tokens with different spellings
    const t = tokenize('The [right/left] mandible and the [R/L] ramus.', 'x')
    const comp2: ParsedComponent = {
      id: 'x',
      title: 'x',
      category: 't',
      modes: ['library'],
      sourcePath: 'x',
      bodyTemplate: t.bodyTemplate,
      fields: t.fields,
      flags: [],
      includes: [],
      tags: [],
      rawBody: 'x',
      warnings: [],
    }
    const sideField = comp2.fields.find((f) => f.kind === 'side')!
    const { text } = assemble(comp2, { [valueKey(sideField)]: 'left' })
    expect(text).toContain('left mandible')
    expect(text).toContain('L ramus')
  })

  it('appends a Missing block when requested', () => {
    const { text } = assemble(comp, {}, { includeMissingBlock: true })
    expect(text).toContain('Missing / to confirm:')
  })

  it('prepends the op-note header checklist when requested', () => {
    const { text } = assemble(comp, {}, { includeHeaderChecklist: true })
    expect(text).toContain('OPERATIVE NOTE HEADER')
  })
})

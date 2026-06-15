import { describe, it, expect } from 'vitest'
import { tokenize } from '../src/lib/tokenizer'
import { assemble, valueKey } from '../src/lib/assembler'
import type { ParsedComponent } from '../src/lib/types'

function comp(body: string, id: string): ParsedComponent {
  const t = tokenize(body, id)
  return {
    id,
    title: id,
    category: 't',
    modes: ['library'],
    sourcePath: id,
    bodyTemplate: t.bodyTemplate,
    fields: t.fields,
    flags: t.flags,
    includes: t.includes,
    smartlinks: t.smartlinks,
    tags: [],
    rawBody: body,
    warnings: t.warnings,
  }
}

describe('review fix: no data loss on unrecognized/slash brackets', () => {
  it('keeps unrecognized bracket text inline in body and output', () => {
    const c = comp('Procedure: [Tooth #__ extracted / no extraction] done.', 'x')
    expect(c.bodyTemplate).toContain('Tooth #__ extracted / no extraction')
    const { text } = assemble(c, {})
    expect(text).toContain('extracted / no extraction')
  })
})

describe('review fix: flags surface in emitted output (not just on-screen)', () => {
  it('prepends an UNRESOLVED block when surfaceFlags is set', () => {
    const c = comp('Body text. [CONFIRM reconcile implant brand]', 'x')
    const { text } = assemble(c, {}, { surfaceFlags: true })
    expect(text).toContain('=== UNRESOLVED')
    expect(text).toContain('reconcile implant brand')
  })
  it('CONFIRM block is stripped from the body itself', () => {
    const c = comp('Body text. [CONFIRM reconcile implant brand]', 'x')
    expect(c.bodyTemplate).not.toContain('[CONFIRM')
  })
})

describe('review fix: per-component side key (no cross-template bleed)', () => {
  it('a side set on component A does not fill component B', () => {
    const a = comp('Op on [R/L] side.', 'compa')
    const b = comp('Op on [R/L] side.', 'compb')
    const aSide = a.fields.find((f) => f.kind === 'side')!
    const bSide = b.fields.find((f) => f.kind === 'side')!
    expect(valueKey(aSide)).toBe('compa:link:side')
    expect(valueKey(bSide)).toBe('compb:link:side')
    const values = { [valueKey(aSide)]: 'left' }
    expect(assemble(a, values).text).toContain('L side')
    const bOut = assemble(b, values)
    expect(bOut.text).toContain('[R/L]') // B unfilled, not bled
    expect(bOut.missing.length).toBeGreaterThan(0)
  })
})

describe('review fix: side never asserts an unchosen value', () => {
  it('a non-canonical stored value is treated as unfilled, not opts[0]', () => {
    const c = comp('Op on [R/L] side.', 'x')
    const side = c.fields.find((f) => f.kind === 'side')!
    const { text } = assemble(c, { [valueKey(side)]: 'banana' })
    expect(text).toContain('[R/L]') // fell through to unfilled, did not render R or L
  })
})

describe('review fix: sentinel unfilled policy for handouts', () => {
  it('renders a visible TO BE COMPLETED marker', () => {
    const c = comp('Follow up in ___ weeks.', 'x')
    const { text } = assemble(c, {}, { unfilledPolicy: 'sentinel' })
    expect(text).toContain('[TO BE COMPLETED]')
  })
})

describe('review fix: smartlink boundary', () => {
  it('a word merely starting with a stem is a field, not a smartlink', () => {
    const c = comp('Give [dobutamine] and note [Age].', 'x')
    expect(c.fields.some((f) => f.kind === 'text')).toBe(true) // dobutamine -> fillable
    expect(c.bodyTemplate).toContain('[Age]') // real smartlink left verbatim
    expect(c.bodyTemplate).not.toContain('[dobutamine]') // became a sentinel
  })
})

describe('review fix: spaced [diameter] x [length] compound', () => {
  it('merges into one hardwareDim even with spaces', () => {
    const c = comp('Implant [diameter] x [length] mm placed.', 'x')
    expect(c.fields.filter((f) => f.kind === 'hardwareDim').length).toBe(1)
  })
})

describe('review fix: literal {{...}} in source does not collide with sentinels', () => {
  it('preserves a literal double-brace string', () => {
    const c = comp('Template uses {{notAField}} and a real [size].', 'x')
    expect(c.bodyTemplate).toContain('{{notAField}}')
    const { text } = assemble(c, {})
    expect(text).toContain('{{notAField}}')
  })
})

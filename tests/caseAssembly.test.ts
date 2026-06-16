import { describe, it, expect } from 'vitest'
import { PROCEDURES, contentById } from '../src/lib/procedures'
import { buildDocument } from '../src/lib/caseAssembly'
import { defaultEncounter } from '../src/lib/encounter'
import type { CaseItem } from '../src/state/useCaseStore'

const enc = defaultEncounter()

function fieldOfKind(procId: string, kind: string) {
  const op = contentById(PROCEDURES.find((p) => p.id === procId)!.opTemplateId)
  return op?.fields.find((f) => f.kind === kind)
}

describe('caseAssembly — instance scoping', () => {
  it('two instances of the same procedure do not bleed values', () => {
    const proc = PROCEDURES.find((p) => fieldOfKind(p.id, 'toothNumber'))
    expect(proc).toBeTruthy()
    const f = fieldOfKind(proc!.id, 'toothNumber')!
    const items: CaseItem[] = [
      { instanceId: 'a', procedureId: proc!.id },
      { instanceId: 'b', procedureId: proc!.id },
    ]
    const values = { [`a::${f.id}`]: '1, 16', [`b::${f.id}`]: '17, 32' }
    const { text } = buildDocument(items, values, enc, 'opnote')
    expect(text).toContain('1, 16')
    expect(text).toContain('17, 32')
  })
})

describe('caseAssembly — documents', () => {
  it('op note includes the encounter header', () => {
    const proc = PROCEDURES[0]
    const items: CaseItem[] = [{ instanceId: 'a', procedureId: proc.id }]
    const e = { ...enc, attending: 'Dr. Test' }
    const { text } = buildDocument(items, {}, e, 'opnote')
    expect(text).toContain('Attending: Dr. Test')
  })

  it('post-op handouts dedupe across two of the same procedure', () => {
    const proc = PROCEDURES.find((p) => p.postopIds.length > 0)!
    const one = buildDocument([{ instanceId: 'a', procedureId: proc.id }], {}, enc, 'postop').text
    const two = buildDocument(
      [
        { instanceId: 'a', procedureId: proc.id },
        { instanceId: 'b', procedureId: proc.id },
      ],
      {},
      enc,
      'postop',
    ).text
    expect(two).toBe(one) // deduped: not doubled
  })

  it('MMF/mandible trauma gets the wire-cutter MMF handout (safety linkage)', () => {
    const mmf = PROCEDURES.find((p) => p.postopIds.includes('post-op-instructions-mmf'))
    expect(mmf).toBeTruthy()
    const { text } = buildDocument([{ instanceId: 'a', procedureId: mmf!.id }], {}, enc, 'postop')
    expect(text.toLowerCase()).toMatch(/wire cutter/)
  })

  it('Rx does not double the pain regimen or vary by setting (no auto-append)', () => {
    // The pain/opioid regimen lives inside the linked Rx component(s). caseAssembly must
    // NOT also append a second pain set — that would print overlapping NSAID+opioid orders.
    const proc = PROCEDURES.find((p) => p.rxIds.includes('post-op-rx'))!
    const items: CaseItem[] = [{ instanceId: 'a', procedureId: proc.id }]
    const clinic = buildDocument(items, {}, { ...enc, setting: 'Clinic' }, 'rx').text
    const or = buildDocument(items, {}, { ...enc, setting: 'OR' }, 'rx').text
    expect(clinic).toBe(or) // setting no longer injects a second regimen
    const opioidHits = (clinic.toLowerCase().match(/oxycodone/g) ?? []).length
    expect(opioidHits).toBeLessThanOrEqual(1) // not double-dosed
  })

  it('a procedure with no post-op handout surfaces a visible marker, never a blank page', () => {
    const proc = PROCEDURES.find((p) => p.postopIds.length === 0)
    expect(proc).toBeTruthy() // e.g. cosmetic / TMJ atoms currently link no handout
    const { text } = buildDocument([{ instanceId: 'a', procedureId: proc!.id }], {}, enc, 'postop')
    expect(text.trim().length).toBeGreaterThan(0) // not blank
    expect(text).toContain('[NO POST-OP HANDOUT LINKED]')
    expect(text).toContain(proc!.name)
  })

  it('a covered + an uncovered procedure shows the handout AND the marker', () => {
    const covered = PROCEDURES.find((p) => p.postopIds.length > 0)!
    const uncovered = PROCEDURES.find((p) => p.postopIds.length === 0)!
    const { text } = buildDocument(
      [
        { instanceId: 'a', procedureId: covered.id },
        { instanceId: 'b', procedureId: uncovered.id },
      ],
      {},
      enc,
      'postop',
    )
    expect(text).toContain('[NO POST-OP HANDOUT LINKED]')
    expect(text).toContain(uncovered.name)
  })

  it('pull sheet assembles for a procedure that has one', () => {
    const proc = PROCEDURES.find((p) => p.pullSheetId)
    expect(proc).toBeTruthy()
    const { text } = buildDocument([{ instanceId: 'a', procedureId: proc!.id }], {}, enc, 'pullsheet')
    expect(text.toUpperCase()).toContain('PULL SHEET')
    expect(text.toUpperCase()).toContain('CONSUMABLES')
  })

  it('smartlinks list does not include unfilled app fields', () => {
    const proc = PROCEDURES.find((p) => contentById(p.opTemplateId)!.fields.length > 0)!
    const { smartlinks } = buildDocument([{ instanceId: 'a', procedureId: proc.id }], {}, enc, 'opnote')
    expect(smartlinks.some((s) => /\[#__\]|\[R\/L\]|\[size\]|\[X\]/.test(s))).toBe(false)
  })
})

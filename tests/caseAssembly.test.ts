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

  it('Rx pain regimen follows the setting (OR -> inpatient)', () => {
    const proc = PROCEDURES.find((p) => p.rxIds.length > 0)!
    const items: CaseItem[] = [{ instanceId: 'a', procedureId: proc.id }]
    const clinic = buildDocument(items, {}, { ...enc, setting: 'Clinic' }, 'rx').text
    const or = buildDocument(items, {}, { ...enc, setting: 'OR' }, 'rx').text
    expect(clinic).not.toBe(or)
  })

  it('smartlinks list does not include unfilled app fields', () => {
    const proc = PROCEDURES.find((p) => contentById(p.opTemplateId)!.fields.length > 0)!
    const { smartlinks } = buildDocument([{ instanceId: 'a', procedureId: proc.id }], {}, enc, 'opnote')
    expect(smartlinks.some((s) => /\[#__\]|\[R\/L\]|\[size\]|\[X\]/.test(s))).toBe(false)
  })
})

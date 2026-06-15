import { describe, it, expect } from 'vitest'
import { parseRx, assembleSelected, type RxLine } from '../src/lib/rx'
import { PROCEDURES } from '../src/lib/procedures'
import { buildDocument } from '../src/lib/caseAssembly'
import { defaultEncounter } from '../src/lib/encounter'

const SAMPLE = `Rx:
[ pfs_discharge_medications ]
Ibuprofen 600 mg PO q6h PRN pain - #30 tabs
Oxycodone 5 mg PO q6h PRN severe pain - #5 tabs

Antibiotics (if indicated):
Amoxicillin 500 mg PO TID x 7 days
OR (if penicillin-allergic):
Clindamycin 300 mg PO TID x 7 days`

const orders = (lines: RxLine[]) => lines.filter((l): l is Extract<RxLine, { kind: 'order' }> => l.kind === 'order')
const headers = (lines: RxLine[]) => lines.filter((l): l is Extract<RxLine, { kind: 'header' }> => l.kind === 'header')

describe('rx checklist parse + assemble', () => {
  it('classifies headers, smartlinks, and orders', () => {
    const { lines, orderCount } = parseRx(SAMPLE)
    expect(orderCount).toBe(4) // ibuprofen, oxycodone, amox, clinda
    expect(headers(lines).map((l) => l.text)).toEqual([
      'Rx:',
      'Antibiotics (if indicated):',
      'OR (if penicillin-allergic):',
    ])
    expect(lines.some((l) => l.kind === 'smartlink')).toBe(true)
  })

  it('full selection round-trips the orders and keeps the smartlink', () => {
    const { lines } = parseRx(SAMPLE)
    const out = assembleSelected(lines, new Set())
    expect(out).toContain('[ pfs_discharge_medications ]')
    expect(out).toContain('Oxycodone 5 mg')
    expect(out).toContain('Amoxicillin 500 mg')
  })

  it('deselecting the opioid removes only that line', () => {
    const { lines } = parseRx(SAMPLE)
    const oxy = orders(lines).find((l) => l.text.startsWith('Oxycodone'))!
    const out = assembleSelected(lines, new Set([oxy.idx]))
    expect(out).not.toContain('Oxycodone')
    expect(out).toContain('Ibuprofen 600 mg')
  })

  it('a header whose every order is deselected drops out (no orphan header)', () => {
    const { lines } = parseRx(SAMPLE)
    const abxIdx = orders(lines)
      .filter((l) => /Amoxicillin|Clindamycin/.test(l.text))
      .map((l) => l.idx)
    const out = assembleSelected(lines, new Set(abxIdx))
    expect(out).not.toContain('Antibiotics (if indicated):')
    expect(out).not.toContain('OR (if penicillin-allergic):')
    expect(out).toContain('Rx:') // Rx group still has selected analgesics + smartlink
  })

  it('works on the real composed Rx (opioid is deselectable)', () => {
    const proc = PROCEDURES.find((p) => p.rxIds.includes('post-op-rx'))!
    const { text } = buildDocument([{ instanceId: 'a', procedureId: proc.id }], {}, defaultEncounter(), 'rx')
    const { lines } = parseRx(text)
    const opioid = orders(lines).find((l) => /oxycodone/i.test(l.text))!
    expect(opioid).toBeTruthy()
    const out = assembleSelected(lines, new Set([opioid.idx]))
    expect(out.toLowerCase()).not.toContain('oxycodone')
  })
})

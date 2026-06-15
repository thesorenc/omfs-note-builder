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

const MENU = `Rx:
Ibuprofen 600 mg PO q6h PRN pain
Oxycodone 5 mg PO q6h PRN severe pain
Dexamethasone 4 mg PO - [TO BE COMPLETED] tabs

Antibiotics (if indicated):
Amoxicillin 500 mg PO TID x 7 days
OR (if penicillin-allergic):
Clindamycin 300 mg PO TID x 7 days

Antibiotic Prophylaxis (Trauma):
Pre-op: Cefazolin 2 g IV
Post-op: Amoxicillin 500 mg PO TID OR Augmentin 875 mg PO BID`

describe('rx clinical-safety defaults (contingent orders start unchecked)', () => {
  const { lines, defaultOffIdx } = parseRx(MENU)
  const order = (re: RegExp) => orders(lines).find((l) => re.test(l.text))!
  const off = new Set(defaultOffIdx)

  it('keeps first-line oral analgesics (and the opioid) ON by default', () => {
    expect(off.has(order(/Ibuprofen/).idx)).toBe(false)
    expect(off.has(order(/Oxycodone/).idx)).toBe(false)
    expect(off.has(order(/^Amoxicillin/).idx)).toBe(false)
  })

  it('turns OFF unfilled, IV/pre-op, OR-alternative, and allergy-alternative orders', () => {
    expect(off.has(order(/TO BE COMPLETED/).idx)).toBe(true) // dex taper with blanks
    expect(off.has(order(/Cefazolin/).idx)).toBe(true) // IV + Pre-op
    expect(off.has(order(/OR Augmentin/).idx)).toBe(true) // OR alternative
    expect(off.has(order(/Clindamycin/).idx)).toBe(true) // under penicillin-allergic header
  })

  it('default selection emits no parenteral, unfilled, or duplicate-antibiotic lines', () => {
    const out = assembleSelected(lines, off)
    expect(out).toContain('Ibuprofen')
    expect(out).not.toMatch(/\bIV\b/)
    expect(out).not.toContain('TO BE COMPLETED')
    expect((out.match(/Amoxicillin/g) ?? []).length).toBeLessThanOrEqual(1)
  })

  it('selecting an allergy alternative re-includes its antecedent header (no orphan)', () => {
    const clinda = order(/Clindamycin/).idx
    const next = new Set(off)
    next.delete(clinda) // opt into clindamycin while amoxicillin stays off
    const amox = order(/^Amoxicillin/).idx
    next.add(amox)
    const out = assembleSelected(lines, next)
    expect(out).toContain('Clindamycin')
    expect(out).toContain('OR (if penicillin-allergic):')
    expect(out).toContain('Antibiotics (if indicated):') // antecedent kept
  })

  it('CRITICAL: a trauma atom (post-op-rx + abx-trauma) does not default to stacked/IV antibiotics', () => {
    const { text } = buildDocument(
      [{ instanceId: 'a', procedureId: 'hardware-removal' }],
      {},
      defaultEncounter(),
      'rx',
    )
    const parsed = parseRx(text)
    const out = assembleSelected(parsed.lines, new Set(parsed.defaultOffIdx))
    expect(out).not.toMatch(/\bIV\b/) // no parenteral pre-op dose in the discharge Rx
    expect(out).not.toContain('TO BE COMPLETED')
    expect((out.match(/Amoxicillin/g) ?? []).length).toBeLessThanOrEqual(1) // no duplicate menus
  })
})

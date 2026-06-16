import { describe, it, expect } from 'vitest'
import { PROCEDURES } from '../src/lib/procedures'
import { buildDocument } from '../src/lib/caseAssembly'
import { parseRx, assembleSelected } from '../src/lib/rx'
import { defaultEncounter } from '../src/lib/encounter'

// What a clinician sees in the Rx tab BEFORE editing (default-off lines removed).
function defaultRx(id: string) {
  const { text } = buildDocument([{ instanceId: 'a', procedureId: id }], {}, defaultEncounter(), 'rx')
  const p = parseRx(text)
  return { full: text, def: assembleSelected(p.lines, new Set(p.defaultOffIdx)) }
}

const COSMETIC_TMJ = [
  'facelift-rhytidectomy',
  'endoscopic-brow-lift',
  'midface-lift',
  'upper-blepharoplasty',
  'lower-blepharoplasty-transconjunctival-fat-repositioning',
  'canthopexy',
  'otoplasty',
  'septorhinoplasty',
  'lip-filler',
  'laser-skin-resurfacing-co2',
  'tmj-arthrocentesis',
  'tmj-arthroscopy-lysis-lavage-prf',
  'tmj-discopexy-mitek-anchor',
  'tmj-eminectomy',
  'tmj-total-joint-replacement',
]

describe('Rx routing — clinical-safety invariants', () => {
  it('every procedure that links an Rx resolves a real, non-empty block (no dangling link)', () => {
    for (const p of PROCEDURES) {
      // Adjunct atoms (closings, accounting) intentionally carry no Rx (rx: []).
      if (p.rxIds.length === 0) continue
      const { full } = defaultRx(p.id)
      expect(full.length, `${p.id} produced empty Rx`).toBeGreaterThan(0)
    }
  })

  it('NO cosmetic/periorbital/TMJ procedure prescribes chlorhexidine oral rinse', () => {
    for (const id of COSMETIC_TMJ) {
      const { full } = defaultRx(id)
      expect(/chlorhexidine|peridex/i.test(full), `${id} should not have an oral rinse`).toBe(false)
    }
  })

  it('NO facial/cosmetic procedure carries the dental dexamethasone taper', () => {
    for (const id of ['facelift-rhytidectomy', 'upper-blepharoplasty', 'lip-filler', 'septorhinoplasty']) {
      const { full } = defaultRx(id)
      expect(/dexamethasone/i.test(full), `${id} should not have a dental steroid taper`).toBe(false)
    }
  })

  it('CO2 laser includes HSV antiviral prophylaxis ON by default', () => {
    expect(defaultRx('laser-skin-resurfacing-co2').def).toContain('Valacyclovir')
  })

  it('lip filler prescribes no opioid', () => {
    expect(/oxycodone|hydrocodone|opioid/i.test(defaultRx('lip-filler').full)).toBe(false)
  })

  it('clean implant/graft does not default to a multi-day discharge antibiotic', () => {
    for (const id of ['dental-implant', 'socket-ridge-graft', 'sinus-augmentation']) {
      const { def } = defaultRx(id)
      expect(/amoxicillin/i.test(def), `${id} antibiotic should be opt-in, not default`).toBe(false)
    }
  })

  it('extraction keeps the dental block with the opioid ON (prior decision preserved)', () => {
    expect(defaultRx('extraction-simple').def.toLowerCase()).toContain('oxycodone')
  })
})

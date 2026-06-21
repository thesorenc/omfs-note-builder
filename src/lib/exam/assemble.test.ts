import { describe, it, expect } from 'vitest'
import { peLine, rosLine, assembleText, posPhrase } from './assemble'
import { PE_SYSTEMS, ROS_SYSTEMS } from './content'
import type { ExamRecord } from './types'

const peSys = (id: string) => PE_SYSTEMS.find((s) => s.id === id)!
const rosSys = (id: string) => ROS_SYSTEMS.find((s) => s.id === id)!
const rec = (over: Partial<ExamRecord> = {}): ExamRecord => ({ marks: {}, detail: {}, comment: '', ...over })

describe('peLine — defaults & legacy toggle', () => {
  it('is empty by default', () => {
    expect(peLine(peSys('mf'), rec())).toBeNull()
    expect(peLine(peSys('mf'), undefined)).toBeNull()
  })

  it('legacy side detail: positives then idiomatic pertinent negatives', () => {
    const l = peLine(peSys('mf'), rec({ marks: { swell: '+', tender: '+', crep: '-', asym: '-' }, detail: { swell: 'left', tender: 'left mandibular body' } }))
    expect(l?.text).toBe('Left facial swelling; tenderness over the left mandibular body; no crepitus; face symmetric.')
    expect(l?.abnormal).toBe(true)
  })

  it('idiomatic negatives, not "no <label>"', () => {
    const l = peLine(peSys('eyes'), rec({ marks: { eom: '-', pupils: '-' } }))
    expect(l?.text).toBe('EOMI; PERRL.')
    expect(l?.abnormal).toBe(false)
  })

  it('comment-only system still renders', () => {
    const l = peLine(peSys('neck'), rec({ comment: 'Collar in place; exam deferred.' }))
    expect(l?.text).toBe('Collar in place; exam deferred.')
    expect(l?.abnormal).toBe(false)
  })

  it('comment is prepended to the start of the system line', () => {
    const l = peLine(peSys('mf'), rec({ marks: { crep: '-' }, comment: 'Guarding noted.' }))
    expect(l?.text).toBe('Guarding noted. No crepitus.')
  })

  it('a per-finding note trails that finding only', () => {
    const l = peLine(peSys('mf'), rec({ marks: { swell: '+', crep: '-' }, detail: { swell: 'left', 'swell.note': 'extends to orbit' } }))
    expect(l?.text).toBe('Left facial swelling — extends to orbit; no crepitus.')
  })
})

describe('Tier-1 controls', () => {
  it('Facial nerve → House-Brackmann grade + side', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { facial: '+' }, detail: { facial: 'IV', 'facial.side': 'left' } }))
    expect(l?.text).toBe('Left House-Brackmann IV facial weakness.')
  })

  it('Facial nerve "−" emits HB I pertinent negative', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { facial: '-' } }))
    expect(l?.text).toBe('Facial nerve symmetric, House-Brackmann I.')
  })

  it('Occlusion (folded into Mouth) → stable vs malocclusion', () => {
    expect(peLine(peSys('io'), rec({ marks: { occ: '-' } }))?.text).toBe('Occlusion stable and reproducible.')
    expect(peLine(peSys('io'), rec({ marks: { occ: '+' }, detail: { occ: 'mal' } }))?.text).toBe('Malocclusion.')
  })

  it('Tooth fracture → multi-tooth list', () => {
    const l = peLine(peSys('io'), rec({ marks: { fx: '+' }, detail: { fx: '8, 9' } }))
    expect(l?.text).toBe('Fracture of #8, #9.')
  })

  it('Trigeminal → division/nerve + deficit type + side', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { sens: '+' }, detail: { 'sens.nerves': 'V3, IAN', 'sens.type': 'anesthesia', 'sens.side': 'left' } }))
    expect(l?.text).toBe('Left V3, IAN anesthesia.')
  })

  it('MIO → measurement, flags trismus below threshold', () => {
    expect(peLine(peSys('tmj'), rec({ marks: { mio: '+' }, detail: { mio: '22' } }))?.text).toBe('Limited opening, MIO 22 mm.')
    expect(peLine(peSys('tmj'), rec({ marks: { mio: '+' }, detail: { mio: '42' } }))?.text).toBe('MIO 42 mm.')
  })

  it('GCS → composite E/V/M with computed total', () => {
    const l = peLine(peSys('neuro'), rec({ marks: { gcs: '+' }, detail: { 'gcs.e': '4', 'gcs.v': '4', 'gcs.m': '6' } }))
    expect(l?.text).toBe('GCS 14 (E4 V4 M6).')
  })

  it('Lymphadenopathy → laterality only (no grades)', () => {
    const l = peLine(peSys('neck'), rec({ marks: { lad: '+' }, detail: { lad: 'right' } }))
    expect(l?.text).toBe('Right cervical lymphadenopathy.')
  })
})

describe('rosLine', () => {
  it('splits positives and negatives', () => {
    const l = rosLine(rosSys('rent'), rec({ marks: { facpain: '+', facswell: '+', swallow: '-', hearing: '-' } }))
    expect(l?.text).toBe('Positive for facial pain, facial swelling. Denies difficulty swallowing, hearing loss.')
    expect(l?.abnormal).toBe(true)
  })
})

describe('assembleText', () => {
  it('labels present sections and omits empty ones', () => {
    const t = assembleText({ mf: rec({ marks: { crep: '-' } }) }, {})
    expect(t).toContain('PHYSICAL EXAMINATION')
    expect(t).not.toContain('REVIEW OF SYSTEMS')
  })

  it('is empty when nothing is addressed', () => {
    expect(assembleText({}, {})).toBe('')
  })
})

describe('content review — relabeled multi-state findings', () => {
  it('General appearance → well / ill / toxic', () => {
    expect(peLine(peSys('gen'), rec({ marks: { appearance: '-' } }))?.text).toBe('Well-appearing, well-nourished.')
    expect(peLine(peSys('gen'), rec({ marks: { appearance: '+' }, detail: { appearance: 'toxic' } }))?.text).toBe('Toxic-appearing.')
  })
  it('Occlusion → malocclusion / open-bite patterns', () => {
    expect(peLine(peSys('io'), rec({ marks: { occ: '+' }, detail: { occ: 'aob' } }))?.text).toBe('Anterior open bite.')
  })
  it('Floor of mouth → elevated / indurated', () => {
    expect(peLine(peSys('io'), rec({ marks: { fom: '+' }, detail: { fom: 'indur' } }))?.text).toBe('Floor-of-mouth induration.')
  })
  it('Midface mobility → Le Fort grade', () => {
    expect(peLine(peSys('mf'), rec({ marks: { lefort: '+' }, detail: { lefort: '2' } }))?.text).toBe('Le Fort II mobility.')
  })
  it('CSF: emits "concerning for CSF leak", not a confirmed diagnosis', () => {
    expect(peLine(peSys('nose'), rec({ marks: { csf: '+' } }))?.text).toBe('Clear rhinorrhea concerning for CSF leak.')
  })
  it('Neck ROM → limited / nuchal rigidity', () => {
    expect(peLine(peSys('neck'), rec({ marks: { rom: '+' }, detail: { rom: 'nuchal' } }))?.text).toBe('Nuchal rigidity.')
  })
})

describe('posPhrase', () => {
  it('legacy custom positive phrase with side detail (value getter)', () => {
    const swell = peSys('mf').elements.find((e) => e.id === 'swell')!
    expect(posPhrase(swell, () => 'left')).toBe('left facial swelling')
  })
})

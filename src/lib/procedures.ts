import type { ParsedComponent } from './types'
import { OP_TEMPLATES, COMPONENTS } from '@/content'

/**
 * A procedure = one operative template plus the post-op handout(s) and Rx that
 * accompany it. The pairings below are RULE-BASED best guesses derived from the
 * procedure's category/title; ones marked `review` are flagged in the UI for the
 * surgeon to confirm. Edit the rules here to change linkage.
 */
export interface Procedure {
  id: string
  name: string
  category: string
  opTemplateId: string
  postopIds: string[]
  rxIds: string[]
  /** true when the post-op pairing is a best-guess worth confirming */
  review: boolean
}

const have = new Set(COMPONENTS.map((c) => c.id))
const keep = (ids: string[]) => ids.filter((id) => have.has(id))

const EXTRACTION = 'post-op-instructions-extraction'
const ORIF = 'post-op-instructions-orif'
const ID = 'post-op-instructions-id'
const MMF = 'post-op-instructions-mmf'
const SINUS = 'sinus-precautions'
const RX = 'post-op-rx'
const ABX_TRAUMA = 'abx-trauma'
const ABX_ODONT = 'abx-odontogenic'

function linkFor(op: ParsedComponent): { postop: string[]; rx: string[]; review: boolean } {
  const t = op.title.toLowerCase()
  const cat = op.category
  let postop: string[] = []
  let rx: string[] = [RX]
  let review = false

  // Sinus/orbit involvement -> nose-blowing precautions (orbital emphysema risk).
  const sinusy = /sinus|le ?fort|zmc|zygomatic|noe|orbit|maxilla|aicbg/.test(t)
  // Cases that commonly leave the patient in MMF / rigid fixation -> wire-cutter handout.
  const mmfy = /mmf|imf|symphysis|mandib|closed reduction|arch bar/.test(t)

  if (cat === 'Trauma') {
    postop = [ORIF]
    rx = [RX, ABX_TRAUMA]
    if (sinusy) postop.push(SINUS)
    if (mmfy) {
      postop.push(MMF)
      review = true // confirm the patient is actually leaving in MMF before issuing wire cutters
    }
    if (/hardware removal/.test(t)) review = true
  } else if (cat === 'Dentoalveolar & Implant') {
    postop = [EXTRACTION]
    if (sinusy) postop.push(SINUS)
  } else if (cat === 'Pathology, Salivary & Infection') {
    if (/drainage|abscess|i&d/.test(t)) {
      postop = [ID]
      rx = [RX, ABX_ODONT] // odontogenic infection coverage
    } else {
      postop = [EXTRACTION]
    }
  } else if (cat === 'Orthognathic') {
    postop = [ORIF, MMF] // guiding elastics / MMF expected
    if (/le ?fort|sarpe/.test(t)) postop.push(SINUS)
    review = true
  } else if (cat === 'TMJ') {
    // Arthroscopy/arthrocentesis is NOT a fracture; the ORIF handout is wrong for it.
    if (!/arthroscop|arthrocentesis/.test(t)) postop = [ORIF]
    review = true
  } else {
    // Cosmetic & Facial: the dentoalveolar Rx block is irrelevant; suppress it, no handout yet.
    rx = []
    review = true
  }

  return { postop: keep([...new Set(postop)]), rx: keep([...new Set(rx)]), review }
}

export const PROCEDURES: Procedure[] = OP_TEMPLATES.map((op) => {
  const { postop, rx, review } = linkFor(op)
  return {
    id: op.id,
    name: op.title,
    category: op.category,
    opTemplateId: op.id,
    postopIds: postop,
    rxIds: rx,
    review,
  }
})

const BY_ID = new Map(PROCEDURES.map((p) => [p.id, p]))
export const procedureById = (id: string) => BY_ID.get(id)

const COMP_BY_ID = new Map([...OP_TEMPLATES, ...COMPONENTS].map((c) => [c.id, c]))
export const contentById = (id: string) => COMP_BY_ID.get(id)

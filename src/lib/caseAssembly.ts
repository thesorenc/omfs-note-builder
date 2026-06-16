import type { FlagAnnotation } from './types'
import { assemble } from './assembler'
import { normalizePlainText } from './normalize'
import { procedureById, contentById, atomById } from './procedures'
import { operativeHeader, type Encounter } from './encounter'
import type { CaseItem } from '@/state/useCaseStore'

export type DocKind = 'opnote' | 'preop' | 'postop' | 'rx' | 'pullsheet'

export interface CaseDocument {
  text: string
  flags: FlagAnnotation[]
  smartlinks: string[]
}

const PREOP_TEXT = `PRE-OPERATIVE INSTRUCTIONS

Before your surgery:
- Nothing to eat or drink after midnight the night before (no food, water, gum, or candy) unless told otherwise.
- Take your usual morning medications with a small sip of water ONLY if your surgeon approved them. Hold blood thinners and diabetes medications as directed.
- If you are having sedation or general anesthesia, arrange a responsible adult to drive you home and stay with you for 24 hours.
- Wear loose, comfortable clothing with short sleeves. Leave jewelry and valuables at home.
- Brush your teeth the morning of surgery, but do not swallow water.
- If you become ill (fever, cold, cough) before surgery, call the clinic.

Day of surgery:
- Arrive at the scheduled time. Bring your ID and a current list of medications and allergies.
- Do not wear makeup, contact lenses, or nail polish.

[TEMPLATE: generic pre-op instructions. Confirm against your protocol and the specific procedure.]`

/** Field values for one instance, with the `${instanceId}::` prefix stripped. */
function scopedValues(values: Record<string, string>, instanceId: string): Record<string, string> {
  const prefix = `${instanceId}::`
  const out: Record<string, string> = {}
  for (const [key, val] of Object.entries(values)) {
    if (key.startsWith(prefix)) out[key.slice(prefix.length)] = val
  }
  return out
}

/**
 * Build one document (Op Note / Post-op / Rx) from the whole case.
 * - Op Note: each procedure instance's operative template, in order, with its own
 *   variables, under a "Procedure — #n" header, after the encounter header.
 * - Post-op / Rx: the union of linked components across the case (deduped), so two
 *   extractions don't print the handout twice.
 */
export function buildDocument(
  items: CaseItem[],
  values: Record<string, string>,
  encounter: Encounter,
  kind: DocKind,
): CaseDocument {
  const flags: FlagAnnotation[] = []
  const smartlinks = new Set<string>()
  const blocks: string[] = []

  if (kind === 'preop') {
    return { text: normalizePlainText(PREOP_TEXT), flags: [], smartlinks: [] }
  }

  if (kind === 'pullsheet') {
    const ids: string[] = []
    for (const item of items) {
      const pid = procedureById(item.procedureId)?.pullSheetId
      if (pid && !ids.includes(pid)) ids.push(pid)
    }
    for (const id of ids) {
      const comp = contentById(id)
      if (!comp) continue
      const r = assemble(comp, {}, { surfaceFlags: true })
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      blocks.push(r.text.trim())
    }
    return { text: normalizePlainText(blocks.join('\n\n')), flags, smartlinks: [...smartlinks] }
  }

  if (kind === 'opnote') {
    const procedureNames = items
      .map((item) => procedureById(item.procedureId)?.name)
      .filter((n): n is string => !!n)
    blocks.push(operativeHeader(encounter, procedureNames))

    items.forEach((item, idx) => {
      const proc = procedureById(item.procedureId)
      // Use the ATOM's own snippet (not contentById) so colliding op-template slugs
      // never substitute a full standalone note for the composable atom body.
      const op = proc && atomById(proc.opTemplateId)
      if (!proc || !op) return
      const r = assemble(op, scopedValues(values, item.instanceId), {
        includeMissingBlock: true,
        surfaceFlags: true,
      })
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      // Strip the snippet's own "PROCEDURE:" line and the authoring [TEMPLATE: ...] markers;
      // the "Name - #n" heading names it and the markers shouldn't paste into the EMR.
      const snippet = r.text
        .trim()
        .replace(/^PROCEDURE:.*\n+/i, '')
        .replace(/\[TEMPLATE:[^\]]*\]\s*/gi, '')
        .trim()
      blocks.push(`${proc.name} - #${idx + 1}\n${'-'.repeat(40)}\n${snippet}`)
    })
  } else {
    // Post-op / Rx: dedupe linked component ids across the case.
    const ids: string[] = []
    const uncovered: string[] = [] // procedures with NO linked handout/Rx of this kind
    for (const item of items) {
      const proc = procedureById(item.procedureId)
      if (!proc) continue
      const linked = kind === 'postop' ? proc.postopIds : proc.rxIds
      if (linked.length === 0 && !uncovered.includes(proc.name)) uncovered.push(proc.name)
      for (const id of linked) {
        if (!ids.includes(id)) ids.push(id)
      }
    }
    for (const id of ids) {
      const comp = contentById(id)
      if (!comp) continue
      const r = assemble(comp, {}, {
        // Rx and post-op both use the visible [TO BE COMPLETED] marker for unfilled
        // fields. For Rx this means a half-specified order (e.g. a steroid taper with
        // blank doses) is clearly flagged and starts unchecked, never copyable as raw "___".
        unfilledPolicy: 'sentinel',
        surfaceFlags: true,
      })
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      blocks.push(r.text.trim())
    }
    // Patient-safety gate: a procedure with no linked post-op handout must NEVER
    // silently produce a blank page that could be printed and handed to a patient.
    // Surface a visible marker naming the uncovered procedure(s) instead.
    if (kind === 'postop' && uncovered.length) {
      const list = uncovered.map((n) => `- ${n}`).join('\n')
      blocks.push(
        `[NO POST-OP HANDOUT LINKED]\nNo post-operative instructions are on file for:\n${list}\n` +
          `Provide procedure-specific discharge instructions before the patient leaves.`,
      )
    }
  }

  return {
    text: normalizePlainText(blocks.join('\n\n')),
    flags,
    smartlinks: [...smartlinks],
  }
}

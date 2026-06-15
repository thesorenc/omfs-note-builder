import type { FlagAnnotation } from './types'
import { assemble } from './assembler'
import { normalizePlainText } from './normalize'
import { procedureById, contentById } from './procedures'
import { encounterHeader, type Encounter } from './encounter'
import type { CaseItem } from '@/state/useCaseStore'

export type DocKind = 'opnote' | 'preop' | 'postop' | 'rx'

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

  if (kind === 'opnote') {
    const header = encounterHeader(encounter)
    if (header) blocks.push(header)

    items.forEach((item, idx) => {
      const proc = procedureById(item.procedureId)
      const op = proc && contentById(proc.opTemplateId)
      if (!proc || !op) return
      const r = assemble(op, scopedValues(values, item.instanceId), {
        includeMissingBlock: true,
        surfaceFlags: true,
      })
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      blocks.push(`${proc.name} — #${idx + 1}\n${'-'.repeat(40)}\n${r.text.trim()}`)
    })
  } else {
    // Post-op / Rx: dedupe linked component ids across the case.
    const ids: string[] = []
    for (const item of items) {
      const proc = procedureById(item.procedureId)
      if (!proc) continue
      for (const id of kind === 'postop' ? proc.postopIds : proc.rxIds) {
        if (!ids.includes(id)) ids.push(id)
      }
    }
    // Rx: append the pain regimen matched to the setting (OR -> inpatient).
    if (kind === 'rx' && ids.length) {
      const pain = encounter.setting === 'OR' ? 'pain-inpatient' : 'pain-outpatient'
      if (!ids.includes(pain)) ids.push(pain)
    }
    for (const id of ids) {
      const comp = contentById(id)
      if (!comp) continue
      const r = assemble(comp, {}, {
        unfilledPolicy: kind === 'postop' ? 'sentinel' : 'keepRaw',
        surfaceFlags: true,
      })
      flags.push(...r.flags)
      r.smartlinks.forEach((s) => smartlinks.add(s))
      blocks.push(r.text.trim())
    }
  }

  return {
    text: normalizePlainText(blocks.join('\n\n')),
    flags,
    smartlinks: [...smartlinks],
  }
}

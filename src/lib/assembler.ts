// Fills a ParsedComponent's bodyTemplate with user values and produces
// paste-ready plain text obeying the CLAUDE.md output contract.

import type { Field, FlagAnnotation, ParsedComponent } from './types'
import { SENTINEL_OPEN as S0, SENTINEL_CLOSE as S1 } from './types'
import { normalizePlainText } from './normalize'

const SENTINEL_RE = new RegExp(`${S0}([^${S1}]+)${S1}`, 'g')

export type FieldValues = Record<string, string>

export interface AssembleOptions {
  /** What to emit for an unfilled field. Default 'keepRaw'. */
  unfilledPolicy?: 'keepRaw' | 'blank' | 'sentinel'
  /** Prepend the operative-note header checklist. */
  includeHeaderChecklist?: boolean
  /** Append the "Missing / to confirm" block. */
  includeMissingBlock?: boolean
  /** Prepend an UNRESOLVED block with any CONFIRM/TITLE CHECK/TEMPLATE NOTE flags. */
  surfaceFlags?: boolean
}

/** Visible marker for an unfilled field in a patient-facing handout. */
export const UNFILLED_SENTINEL = '[TO BE COMPLETED]'

/** Reviewer-annotation flag types that must never be silently dropped. */
const ANNOTATION_TYPES = new Set(['CONFIRM', 'TITLE CHECK', 'TEMPLATE NOTE'])

export interface AssembleResult {
  text: string
  missing: string[]
  flags: FlagAnnotation[]
  /** Bracketed tokens left verbatim for the EHR to fill. */
  smartlinks: string[]
}

/** Canonical side ('right' | 'left') for a display option like 'R' or 'left'. */
export function canonicalSide(opt: string): 'right' | 'left' {
  return /^r/i.test(opt.trim()) ? 'right' : 'left'
}

/**
 * The store key a field reads its value from. Linked fields (sides) share a key,
 * but the key is namespaced per component so a side set on one template/component
 * never bleeds into another. componentId is the prefix of field.id.
 */
export function valueKey(field: Field): string {
  if (!field.linkKey) return field.id
  const componentId = field.id.split(':')[0]
  return `${componentId}:link:${field.linkKey}`
}

/** Remove reserved private-use sentinels from any user-entered value. */
function clean(v: string): string {
  return v.replace(/[\uE000\uE001]/g, "")
}

function formatField(field: Field, values: FieldValues): string | null {
  if (field.kind === 'side') {
    const canonical = values[valueKey(field)]
    if (!canonical) return null
    const opts = field.options ?? ['right', 'left']
    const match = opts.find((o) => canonicalSide(o) === canonical)
    // Never assert a side that was not chosen: if nothing matches, treat as unfilled.
    return match ?? null
  }
  if (field.kind === 'hardwareDim') {
    const d = values[`${field.id}:d`]
    const l = values[`${field.id}:l`]
    if (!d && !l) return null
    return `${d ? clean(d) : '_'}x${l ? clean(l) : '_'}`
  }
  if (field.kind === 'optionalClause') {
    // Three states: 'on' includes the clause (brackets stripped), 'omit' removes it,
    // anything else (undecided) keeps the bracketed clause verbatim — identical to the
    // pre-feature behavior, so an untouched note is byte-for-byte unchanged.
    const v = values[field.id]
    if (v === 'on') return field.raw.replace(/^\[|\]$/g, '').trim()
    if (v === 'omit') return ''
    return field.raw
  }
  const v = values[field.id]
  return v && v.trim() ? clean(v.trim()) : null
}

const HEADER_CHECKLIST = `OPERATIVE NOTE HEADER (verify/complete):
Preoperative diagnosis:
Postoperative diagnosis:
Procedure(s) performed:
Surgeon / Assistant(s) / Attending:
Anesthesia & airway:
Specimens (with destination):
Implants / hardware (manufacturer, size, lot):
Drains / dressings / splints / MMF:
EBL / IV fluids / urine output / counts correct:
Complications:
Disposition & condition:
CPT / total operative time:
`

export function assemble(
  component: ParsedComponent,
  values: FieldValues,
  options: AssembleOptions = {},
  resolveInclude?: (dotPhrase: string) => ParsedComponent | undefined,
  seen: Set<string> = new Set(),
): AssembleResult {
  const policy = options.unfilledPolicy ?? 'keepRaw'
  const missing: string[] = []
  const flags: FlagAnnotation[] = [...component.flags]
  const smartlinkSet = new Set(component.smartlinks ?? [])
  const fieldById = new Map(component.fields.map((f) => [f.id, f]))

  let text = component.bodyTemplate.replace(SENTINEL_RE, (_m, token: string) => {
    if (token.startsWith('include:')) {
      const dot = token.slice('include:'.length)
      if (resolveInclude && !seen.has(dot)) {
        const inc = resolveInclude(dot)
        if (inc) {
          // `seen` is a recursion STACK (ancestors only), not a global visited set:
          // add before recursing and remove after, so a true cycle is broken but a
          // legitimately repeated include (the same handout twice in one document)
          // still resolves instead of degrading to "[insert .sacX]".
          seen.add(dot)
          const sub = assemble(inc, values, {}, resolveInclude, seen)
          seen.delete(dot)
          flags.push(...sub.flags)
          missing.push(...sub.missing)
          sub.smartlinks.forEach((s) => smartlinkSet.add(s))
          return sub.text.trimEnd()
        }
      }
      return `[insert ${dot}]`
    }
    const field = fieldById.get(token)
    if (!field) return ''
    const formatted = formatField(field, values)
    if (formatted === null) {
      // Prefer the containing sentence ("Tooth ___ was tested for profound anesthesia.")
      // over the bare kind label, so the checklist reads as actionable clinical prose.
      missing.push(field.context ?? field.label)
      if (policy === 'blank') return ''
      if (policy === 'sentinel') return UNFILLED_SENTINEL
      return field.raw
    }
    return formatted
  })

  const smartlinks = [...smartlinkSet]
  const annotationFlags = flags.filter((f) => ANNOTATION_TYPES.has(f.type))

  if (options.includeHeaderChecklist) {
    text = `${HEADER_CHECKLIST}\n${text}`
  }

  // Surface unresolved reviewer flags at the TOP so they survive copy/print/download.
  if (options.surfaceFlags && annotationFlags.length) {
    // Marker uses '=' (not '*') so normalizePlainText's emphasis stripper leaves it intact.
    const block = annotationFlags.map((f) => `- ${f.type}: ${f.text}`).join('\n')
    text = `=== UNRESOLVED - VERIFY AND REMOVE BEFORE SIGNING ===\n${block}\n=== END UNRESOLVED ===\n\n${text}`
  }

  if (options.includeMissingBlock) {
    // Dedupe; omit flags here if already surfaced at the top.
    const items = [
      ...new Set([
        ...missing,
        ...(options.surfaceFlags ? [] : flags.map((f) => `${f.type}: ${f.text}`)),
      ]),
    ]
    if (items.length) {
      text += `\n\nMissing / to confirm:\n${items.map((i) => `- ${i}`).join('\n')}`
    }
  }

  return { text: normalizePlainText(text), missing, flags, smartlinks }
}

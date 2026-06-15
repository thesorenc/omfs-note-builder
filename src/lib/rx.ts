// Pure parsing/assembly for the interactive Rx checklist. The linked Rx components
// emit a flat list of order lines grouped under "Header:" labels (with smartlink
// tokens and "OR:" alternatives mixed in). The clinician deselects orders they
// don't want; only selected lines — and the headers that still have content —
// are assembled into the final prescription text.
//
// Clinical-safety defaults: contingent / non-outpatient lines start UNCHECKED so the
// default prescription is never a stack of duplicate or unfillable orders. A line
// defaults OFF when it is an allergy alternative, an "OR" alternative, a parenteral
// (IV/IM) or scenario/pre-op order, or still contains an unfilled "[TO BE COMPLETED]"
// placeholder. First-line oral orders (and opioids — the user's explicit "deselect,
// don't auto-decide" choice) stay ON. See HISTORY for the rationale.

import { UNFILLED_SENTINEL } from './assembler'

export type RxLine =
  | { kind: 'header'; text: string; alt: boolean }
  | { kind: 'smartlink'; text: string }
  | { kind: 'order'; text: string; idx: number; header: number; defaultOff: boolean }
  | { kind: 'blank' }

/** An "OR ..."-style subheader (e.g. "OR (if penicillin-allergic):") rather than a top-level group. */
function isAltHeader(t: string): boolean {
  return /^or\b/i.test(t)
}

/**
 * Should this order line be unchecked by default? Deterministic, content-agnostic
 * safety net: parenteral, alternative, allergy-specific, scenario/pre-op, and
 * unfilled orders are never part of the default outpatient prescription.
 */
function orderDefaultsOff(line: string, headerText: string): boolean {
  if (line.includes(UNFILLED_SENTINEL)) return true // can't prescribe a line with blanks
  if (/\b(IV|IM)\b/.test(line)) return true // parenteral — not an outpatient Rx
  if (/\bOR\b/.test(line)) return true // an "OR" alternative ("pick one of")
  if (/^(pre-?op|intra-?op|inpatient|outpatient|if\b|consider|severe|tetanus|through-and-through|open wound)/i.test(line))
    return true
  if (/penicillin|allerg/i.test(headerText) || /penicillin|allerg/i.test(line)) return true
  return false
}

export function parseRx(text: string): { lines: RxLine[]; orderCount: number; defaultOffIdx: number[] } {
  const lines: RxLine[] = []
  const defaultOffIdx: number[] = []
  let idx = 0
  let header = -1
  let headerText = ''
  for (const raw of text.split('\n')) {
    const t = raw.trim()
    if (!t) {
      lines.push({ kind: 'blank' })
      continue
    }
    if (/^\[.*\]$/.test(t) && !t.includes(UNFILLED_SENTINEL)) {
      lines.push({ kind: 'smartlink', text: t })
      continue
    }
    // A pure header is a label that ends in ":" (e.g. "Antibiotics (if indicated - ...):").
    // "Post-op: Amoxicillin ..." has an internal colon but does not END in one, so it stays an order.
    if (/:$/.test(t)) {
      header = lines.length
      headerText = t
      lines.push({ kind: 'header', text: t, alt: isAltHeader(t) })
      continue
    }
    const defaultOff = orderDefaultsOff(t, headerText)
    if (defaultOff) defaultOffIdx.push(idx)
    lines.push({ kind: 'order', text: t, idx, header, defaultOff })
    idx++
  }
  return { lines, orderCount: idx, defaultOffIdx }
}

/**
 * Headers to keep = those with at least one selected order, or a smartlink, in their span.
 * When a kept header is an "OR ..." alternative subheader, its nearest preceding top-level
 * header is also kept so the alternative never appears orphaned (without its antecedent).
 */
export function keptHeaders(lines: RxLine[], deselected: Set<number>): Set<number> {
  const keep = new Set<number>()
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]
    if (l.kind === 'order' && !deselected.has(l.idx)) keep.add(l.header)
    if (l.kind === 'smartlink') {
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].kind === 'header') {
          keep.add(j)
          break
        }
      }
    }
  }
  // Pull in the antecedent top-level header for any kept "OR ..." subheader.
  for (const i of [...keep]) {
    const h = lines[i]
    if (h.kind === 'header' && h.alt) {
      for (let j = i - 1; j >= 0; j--) {
        const p = lines[j]
        if (p.kind === 'header' && !p.alt) {
          keep.add(j)
          break
        }
      }
    }
  }
  return keep
}

export function assembleSelected(lines: RxLine[], deselected: Set<number>): string {
  const keep = keptHeaders(lines, deselected)
  const out: string[] = []
  lines.forEach((l, i) => {
    if (l.kind === 'header') {
      if (keep.has(i)) out.push(l.text)
    } else if (l.kind === 'smartlink') {
      out.push(l.text)
    } else if (l.kind === 'order') {
      if (!deselected.has(l.idx)) out.push(l.text)
    } else {
      out.push('')
    }
  })
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

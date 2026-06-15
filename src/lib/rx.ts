// Pure parsing/assembly for the interactive Rx checklist. The linked Rx components
// emit a flat list of order lines grouped under "Header:" labels (with smartlink
// tokens and "OR:" alternatives mixed in). The clinician deselects orders they
// don't want; only selected lines — and the headers that still have content —
// are assembled into the final prescription text.

export type RxLine =
  | { kind: 'header'; text: string }
  | { kind: 'smartlink'; text: string }
  | { kind: 'order'; text: string; idx: number; header: number }
  | { kind: 'blank' }

export function parseRx(text: string): { lines: RxLine[]; orderCount: number } {
  const lines: RxLine[] = []
  let idx = 0
  let header = -1
  for (const raw of text.split('\n')) {
    const t = raw.trim()
    if (!t) {
      lines.push({ kind: 'blank' })
      continue
    }
    if (/^\[.*\]$/.test(t)) {
      lines.push({ kind: 'smartlink', text: t })
      continue
    }
    // A pure header is a label that ends in ":" (e.g. "Antibiotics (if indicated - ...):").
    // "Post-op: Amoxicillin ..." has an internal colon but does not END in one, so it stays an order.
    if (/:$/.test(t)) {
      header = lines.length
      lines.push({ kind: 'header', text: t })
      continue
    }
    lines.push({ kind: 'order', text: t, idx: idx++, header })
  }
  return { lines, orderCount: idx }
}

/** Headers to keep = those with at least one selected order, or a smartlink, in their span. */
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

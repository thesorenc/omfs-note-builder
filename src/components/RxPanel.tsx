import { useMemo, useState } from 'react'
import { downloadText } from '@/lib/export'
import type { FlagAnnotation } from '@/lib/types'
import { parseRx, assembleSelected } from '@/lib/rx'
import { FlagBanner } from './FlagBanner'
import { formatBlocks } from './DocFormat'

/**
 * Interactive prescription panel. The linked Rx components carry every candidate
 * order (NSAID, opioid, antibiotic tiers, allergy alternatives, steroid taper).
 * The clinician deselects what doesn't apply — opioids when none are wanted,
 * duplicate/irrelevant antibiotic tiers — and only the checked lines are copied,
 * printed, or downloaded. Nothing is persisted (PHI hygiene); selections reset
 * whenever the case composition changes.
 */
export function RxPanel({
  text,
  smartlinks,
  flags,
  filename = 'rx.txt',
}: {
  text: string
  smartlinks?: string[]
  flags?: FlagAnnotation[]
  filename?: string
}) {
  const { lines, orderCount, defaultOffIdx } = useMemo(() => parseRx(text), [text])
  // Contingent orders (allergy alternatives, IV/inpatient doses, "OR" alternatives,
  // and unfilled "[TO BE COMPLETED]" lines) start unchecked; first-line oral orders
  // (and opioids) start checked. The clinician opts into the rest.
  const [deselected, setDeselected] = useState<Set<number>>(() => new Set(defaultOffIdx))
  const [copied, setCopied] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')

  // Reset selections whenever the composed Rx changes (procedure added/removed).
  // Adjusting state during render on a changed input is React's recommended idiom.
  const [prevText, setPrevText] = useState(text)
  if (text !== prevText) {
    setPrevText(text)
    setDeselected(new Set(defaultOffIdx))
  }

  const selectedText = useMemo(() => assembleSelected(lines, deselected), [lines, deselected])
  const selectedCount = orderCount - deselected.size

  function toggle(idx: number) {
    setDeselected((prev) => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(selectedText)
      setCopied(true)
      setLiveMsg('Prescription copied')
      setTimeout(() => {
        setCopied(false)
        setLiveMsg('')
      }, 1500)
    } catch {
      window.prompt('Copy failed — select and copy manually:', selectedText)
    }
  }

  return (
    <>
      <div className="out-toolbar no-print">
        <span className="out-kind">
          <span className="dot" />
          {selectedCount} of {orderCount} orders selected
        </span>
        <span className="spacer" />
        <button className={'btn-primary' + (copied ? ' copied' : '')} onClick={copy}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button className="btn-sm" onClick={() => window.print()}>
          Print / PDF
        </button>
        <button className="btn-sm" onClick={() => downloadText(filename, selectedText)}>
          Download
        </button>
        <button className="btn-sm" onClick={() => setDeselected(new Set())}>
          Select all
        </button>
        <button className="btn-sm" onClick={() => setDeselected(new Set(defaultOffIdx))}>
          Reset
        </button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>

      <div className="out-scroll">
        {flags && flags.length > 0 && <FlagBanner flags={flags} />}
        {smartlinks && smartlinks.length > 0 && (
          <div className="flag-note smartlink no-print">
            <b>Left for the EHR to fill:</b> {smartlinks.join(', ')}
          </div>
        )}
        <p className="rx-help no-print">
          Antibiotic alternatives, IV/inpatient doses, and orders that still need a dose
          (“[TO BE COMPLETED]”) start unchecked — check the ones you’re prescribing and
          fill any blanks. Uncheck anything else you don’t want (e.g. opioids). Only checked
          lines are copied, printed, or downloaded.
        </p>

        {/* interactive checklist (screen only) */}
        <div className="doc rx-list no-print">
          {lines.map((l, i) => {
            if (l.kind === 'blank') return <div key={i} className="rx-gap" />
            if (l.kind === 'header')
              return (
                <div key={i} className="rx-group-h">
                  {l.text}
                </div>
              )
            if (l.kind === 'smartlink')
              return (
                <div key={i} className="rx-smartlink">
                  {l.text}
                </div>
              )
            const off = deselected.has(l.idx)
            return (
              <label key={i} className={'rx-item' + (off ? ' off' : '')}>
                <input type="checkbox" checked={!off} onChange={() => toggle(l.idx)} />
                <span>{l.text}</span>
              </label>
            )
          })}
        </div>

        {/* clean formatted version (print only) */}
        <div className="doc print-only">{formatBlocks(selectedText, 'doc')}</div>
      </div>
    </>
  )
}

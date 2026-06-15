import { useState } from 'react'
import { downloadText } from '@/lib/export'
import { UNFILLED_SENTINEL } from '@/lib/assembler'
import type { FlagAnnotation } from '@/lib/types'
import { FlagBanner } from './FlagBanner'
import { formatBlocks } from './DocFormat'

export function OutputPanel({
  text,
  smartlinks,
  flags,
  filename = 'note.txt',
  patientFacing = false,
}: {
  text: string
  smartlinks?: string[]
  flags?: FlagAnnotation[]
  filename?: string
  patientFacing?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')
  const unfilledCount = (
    text.match(new RegExp(UNFILLED_SENTINEL.replace(/[[\]]/g, '\\$&'), 'g')) ?? []
  ).length

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setLiveMsg(patientFacing ? 'Handout copied' : 'Note copied')
      setTimeout(() => {
        setCopied(false)
        setLiveMsg('')
      }, 1500)
    } catch {
      window.prompt('Copy failed — select and copy manually:', text)
    }
  }

  return (
    <>
      <div className="out-toolbar no-print">
        <span className="out-kind">
          <span className={'dot' + (patientFacing ? ' print' : '')} />
          {patientFacing ? 'Printable handout' : 'Formatted · copies clean to EMR'}
        </span>
        <span className="spacer" />
        <button className={'btn-primary' + (copied ? ' copied' : '')} onClick={copy}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button className="btn-sm" onClick={() => window.print()}>
          Print / PDF
        </button>
        <button className="btn-sm" onClick={() => downloadText(filename, text)}>
          Download
        </button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>

      <div className="out-scroll">
        {flags && flags.length > 0 && <FlagBanner flags={flags} />}
        {patientFacing && unfilledCount > 0 && (
          <div className="flag-note unfilled no-print">
            {unfilledCount} field{unfilledCount > 1 ? 's' : ''} still marked “{UNFILLED_SENTINEL}”.
            Complete before giving this handout to a patient.
          </div>
        )}
        {smartlinks && smartlinks.length > 0 && (
          <div className="flag-note smartlink no-print">
            <b>Left for the EHR to fill:</b> {smartlinks.join(', ')}
          </div>
        )}

        {patientFacing ? (
          <div className="sheet">
            <div className="sheet-head">
              <div className="clinic">
                Walter Reed NMMC — OMFS
                <small>Patient Instructions</small>
              </div>
              <div className="meta">{new Date().toLocaleDateString()}</div>
            </div>
            {formatBlocks(text, 'sheet')}
            <div className="sheet-foot">
              Questions or concerns? Contact the OMFS clinic. Seek emergency care for severe
              bleeding, difficulty breathing or swallowing, or fever above 101.5°F.
            </div>
          </div>
        ) : (
          <div className="doc">{formatBlocks(text, 'doc')}</div>
        )}
      </div>
    </>
  )
}

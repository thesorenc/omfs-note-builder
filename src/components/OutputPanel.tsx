import { useState } from 'react'
import { downloadText } from '@/lib/export'
import { UNFILLED_SENTINEL } from '@/lib/assembler'

export function OutputPanel({
  text,
  smartlinks,
  filename = 'note.txt',
  patientFacing = false,
}: {
  text: string
  smartlinks?: string[]
  filename?: string
  patientFacing?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const unfilledCount = (text.match(new RegExp(UNFILLED_SENTINEL.replace(/[[\]]/g, '\\$&'), 'g')) ?? [])
    .length

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API can reject on insecure origins / denied permission.
      window.prompt('Copy failed - select and copy manually:', text)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 no-print">
        <button
          onClick={copy}
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          onClick={() => window.print()}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
        >
          Print / PDF
        </button>
        <button
          onClick={() => downloadText(filename, text)}
          className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
        >
          Download
        </button>
      </div>

      {patientFacing && unfilledCount > 0 && (
        <div className="no-print rounded border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
          {unfilledCount} field{unfilledCount > 1 ? 's' : ''} still marked “{UNFILLED_SENTINEL}”.
          Complete before giving this handout to a patient.
        </div>
      )}

      {smartlinks && smartlinks.length > 0 && (
        <div className="no-print rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <span className="font-semibold">Left for the EHR to fill:</span> {smartlinks.join(', ')}
        </div>
      )}

      <pre
        className={`print-area whitespace-pre-wrap rounded border border-slate-200 bg-white p-4 text-sm ${
          patientFacing ? 'font-sans leading-relaxed' : 'font-mono'
        }`}
      >
        {text}
      </pre>
    </div>
  )
}

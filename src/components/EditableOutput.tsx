import { useEffect, useRef, useState } from 'react'
import { formatHtml } from './DocFormat'
import { downloadText } from '@/lib/export'

/**
 * A formatted, EDITABLE document for the pull sheet: renders the assembled text as
 * a structured contentEditable doc the user can tweak before printing. Manual edits
 * persist until the case composition changes (the effect only re-applies when `text`
 * changes, which happens when procedures are added/removed, not on field keystrokes).
 * Nothing is persisted — edits are ephemeral, pre-print only (PHI hygiene).
 */
export function EditableOutput({ text, filename = 'pull-sheet.txt' }: { text: string; filename?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)
  const [liveMsg, setLiveMsg] = useState('')

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = formatHtml(text)
  }, [text])

  const current = () => ref.current?.innerText ?? text
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(current())
      setCopied(true)
      setLiveMsg('Pull sheet copied')
      setTimeout(() => {
        setCopied(false)
        setLiveMsg('')
      }, 1500)
    } catch {
      window.prompt('Copy failed — select and copy manually:', current())
    }
  }

  return (
    <>
      <div className="out-toolbar no-print">
        <span className="out-kind">
          <span className="dot print" />
          Editable · click to edit, then print
        </span>
        <span className="spacer" />
        <button className={'btn-primary' + (copied ? ' copied' : '')} onClick={copy}>
          {copied ? 'Copied' : 'Copy text'}
        </button>
        <button className="btn-sm" onClick={() => window.print()}>
          Print / PDF
        </button>
        <button className="btn-sm" onClick={() => downloadText(filename, current())}>
          Download
        </button>
        <button
          className="btn-sm"
          onClick={() => {
            if (ref.current) ref.current.innerHTML = formatHtml(text)
          }}
        >
          Reset
        </button>
      </div>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {liveMsg}
      </div>
      <div className="out-scroll">
        <div
          className="doc pullsheet-doc"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          aria-label="Editable pull sheet — click to edit, then print"
          ref={ref}
        />
      </div>
    </>
  )
}

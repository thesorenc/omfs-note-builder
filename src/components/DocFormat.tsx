import type { ReactNode } from 'react'

// Light formatter: turns the assembled plain-text note into a structured visual
// document. The COPY/DOWNLOAD paths still use the raw text — this is display only.

const SECTION_LABEL = /^([A-Z][A-Z0-9 ()/&.-]{1,34}):\s+(.*)$/s

function paragraph(text: string, cls: string, key: string): ReactNode {
  const m = text.match(SECTION_LABEL)
  if (m && m[1] === m[1].toUpperCase()) {
    return (
      <p className={cls} key={key}>
        <b>{m[1]}:</b> {m[2]}
      </p>
    )
  }
  return (
    <p className={cls} key={key}>
      {text}
    </p>
  )
}

/**
 * Render assembled text as formatted blocks.
 * variant 'doc' uses .doc-* classes; 'sheet' uses bare h3/p/ul (styled under .sheet).
 */
export function formatBlocks(text: string, variant: 'doc' | 'sheet'): ReactNode[] {
  const hCls = variant === 'doc' ? 'doc-h' : undefined
  const pCls = variant === 'doc' ? 'doc-p' : undefined
  const ulCls = variant === 'doc' ? 'doc-ul' : undefined
  const out: ReactNode[] = []

  text
    .split(/\n{2,}/)
    .map((b) => b.trimEnd())
    .filter(Boolean)
    .forEach((blk, i) => {
      const key = `b${i}`
      const lines = blk.split('\n')

      // Warning blocks (unresolved flags / missing list)
      if (/^===\s*UNRESOLVED/m.test(blk) || /^Missing \/ to confirm:/i.test(blk)) {
        out.push(
          <div className="doc-note" key={key}>
            {blk}
          </div>,
        )
        return
      }

      // Key: value header block (e.g. encounter header)
      if (lines.length >= 2 && lines.every((l) => /^[A-Za-z][A-Za-z ()/-]{0,34}:\s+\S/.test(l))) {
        out.push(
          <div className="doc-kv" key={key}>
            {lines.map((l, j) => {
              const idx = l.indexOf(':')
              return (
                <div className="doc-kv-row" key={j}>
                  <span className="k">{l.slice(0, idx)}</span>
                  <span className="v">{l.slice(idx + 1).trim()}</span>
                </div>
              )
            })}
          </div>,
        )
        return
      }

      // Procedure header: "Name — #n" then a dashed rule
      if (/—\s*#\d/.test(lines[0]) && /^-{4,}$/.test(lines[1] ?? '')) {
        out.push(
          <h3 className={hCls} key={key}>
            {lines[0]}
          </h3>,
        )
        const rest = lines.slice(2).join('\n').trim()
        if (rest) out.push(paragraph(rest, pCls ?? '', `${key}r`))
        return
      }

      // Bullet list
      if (lines.length && lines.every((l) => /^[-•]\s/.test(l))) {
        out.push(
          <ul className={ulCls} key={key}>
            {lines.map((l, j) => (
              <li key={j}>{l.replace(/^[-•]\s/, '')}</li>
            ))}
          </ul>,
        )
        return
      }

      // Standalone all-caps section label
      if (lines.length === 1 && /^[A-Z0-9 ()/&.-]{2,40}:?$/.test(lines[0])) {
        out.push(
          <h3 className={hCls} key={key}>
            {lines[0].replace(/:$/, '')}
          </h3>,
        )
        return
      }

      out.push(paragraph(blk, pCls ?? '', key))
    })

  return out
}

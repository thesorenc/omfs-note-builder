import type { ReactNode } from 'react'

// Light formatter: turns the assembled plain-text note into a structured visual
// document. The COPY/DOWNLOAD paths still use the raw text — this is display only.

const SECTION_LABEL = /^([A-Z][A-Z0-9 ()/&.-]{1,34}):\s+(.*)$/s
const LABEL_LINE = /^[A-Z0-9 ()/&.-]{2,40}:?$/

function esc(s: string): string {
  // Escapes text AND attribute-significant quotes, so it stays safe even if a future
  // change interpolates user text into an attribute (today it's element text only).
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Same block logic as formatBlocks, but emits an escaped HTML string for use in a
 * contentEditable region (editable, well-formatted pull sheets that print cleanly).
 */
export function formatHtml(text: string): string {
  const out: string[] = []
  text
    .split(/\n{2,}/)
    .map((b) => b.trimEnd())
    .filter(Boolean)
    .forEach((blk) => {
      const lines = blk.split('\n')
      if (/^===\s*UNRESOLVED/m.test(blk) || /^Missing \/ to confirm:/i.test(blk)) {
        out.push(`<div class="doc-note">${esc(blk)}</div>`)
        return
      }
      if (/^PREOPERATIVE DIAGNOSIS:/.test(lines[0])) {
        const rows = lines
          .map((l) => {
            const m = l.match(/^([A-Z][^:]*:)(.*)$/)
            if (!m) return `<div class="oh-item">${esc(l.trim())}</div>`
            const v = m[2].trim()
            const isList = /PROCEDURE\(S\) PERFORMED/.test(m[1])
            const tail = v ? `<span class="v">${esc(v)}</span>` : isList ? '' : '<span class="blank">________</span>'
            return `<div class="oh-row"><span class="k">${esc(m[1])}</span>${tail}</div>`
          })
          .join('')
        out.push(`<div class="doc-opheader">${rows}</div>`)
        return
      }
      if (lines.length >= 2 && lines.every((l) => /^[A-Za-z][A-Za-z ()/-]{0,34}:\s+\S/.test(l))) {
        const rows = lines
          .map((l) => {
            const i = l.indexOf(':')
            return `<div class="doc-kv-row"><span class="k">${esc(l.slice(0, i))}</span><span class="v">${esc(l.slice(i + 1).trim())}</span></div>`
          })
          .join('')
        out.push(`<div class="doc-kv">${rows}</div>`)
        return
      }
      if (/[—-]\s*#\d/.test(lines[0]) && /^-{4,}$/.test(lines[1] ?? '')) {
        out.push(`<h3 class="doc-h">${esc(lines[0])}</h3>`)
        const rest = lines.slice(2).join('\n').trim()
        if (rest) out.push(`<p class="doc-p">${esc(rest)}</p>`)
        return
      }
      if (lines.length > 1 && LABEL_LINE.test(lines[0]) && lines[0] === lines[0].toUpperCase()) {
        out.push(`<h3 class="doc-h">${esc(lines[0].replace(/:$/, ''))}</h3>`)
        const rest = lines.slice(1)
        if (rest.every((l) => /^[-•]\s/.test(l))) {
          out.push(`<ul class="doc-ul">${rest.map((l) => `<li>${esc(l.replace(/^[-•]\s/, ''))}</li>`).join('')}</ul>`)
        } else {
          out.push(`<p class="doc-p">${esc(rest.join('\n'))}</p>`)
        }
        return
      }
      if (lines.length && lines.every((l) => /^[-•]\s/.test(l))) {
        const li = lines.map((l) => `<li>${esc(l.replace(/^[-•]\s/, ''))}</li>`).join('')
        out.push(`<ul class="doc-ul">${li}</ul>`)
        return
      }
      if (lines.length === 1 && LABEL_LINE.test(lines[0])) {
        out.push(`<h3 class="doc-h">${esc(lines[0].replace(/:$/, ''))}</h3>`)
        return
      }
      const m = blk.match(SECTION_LABEL)
      if (m && m[1] === m[1].toUpperCase()) {
        out.push(`<p class="doc-p"><b>${esc(m[1])}:</b> ${esc(m[2])}</p>`)
      } else {
        out.push(`<p class="doc-p">${esc(blk)}</p>`)
      }
    })
  return out.join('\n')
}

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

      // Operative-note header: labeled lines (some blank to complete) + the indented
      // procedure list. Rendered with line breaks preserved so it never collapses into
      // a paragraph; labels are emphasized and to-complete blanks read clearly.
      if (/^PREOPERATIVE DIAGNOSIS:/.test(lines[0])) {
        out.push(
          <div className="doc-opheader" key={key}>
            {lines.map((l, j) => {
              const m = l.match(/^([A-Z][^:]*:)(.*)$/)
              if (!m) return <div className="oh-item" key={j}>{l.trim()}</div> // procedure list line
              const isList = /PROCEDURE\(S\) PERFORMED/.test(m[1]) // value is the indented list below
              return (
                <div className="oh-row" key={j}>
                  <span className="k">{m[1]}</span>
                  {m[2].trim() ? (
                    <span className="v">{m[2].trim()}</span>
                  ) : isList ? null : (
                    <span className="blank">________</span>
                  )}
                </div>
              )
            })}
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

      // Procedure header: "Name - #n" then a dashed rule
      if (/[—-]\s*#\d/.test(lines[0]) && /^-{4,}$/.test(lines[1] ?? '')) {
        out.push(
          <h3 className={hCls} key={key}>
            {lines[0]}
          </h3>,
        )
        const rest = lines.slice(2).join('\n').trim()
        if (rest) out.push(paragraph(rest, pCls ?? '', `${key}r`))
        return
      }

      // Section label line followed by its body (bullets or prose)
      if (lines.length > 1 && LABEL_LINE.test(lines[0]) && lines[0] === lines[0].toUpperCase()) {
        out.push(
          <h3 className={hCls} key={key}>
            {lines[0].replace(/:$/, '')}
          </h3>,
        )
        const rest = lines.slice(1)
        if (rest.every((l) => /^[-•]\s/.test(l))) {
          out.push(
            <ul className={ulCls} key={key + 'u'}>
              {rest.map((l, j) => (
                <li key={j}>{l.replace(/^[-•]\s/, '')}</li>
              ))}
            </ul>,
          )
        } else {
          out.push(paragraph(rest.join('\n'), pCls ?? '', key + 'p'))
        }
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
      if (lines.length === 1 && LABEL_LINE.test(lines[0])) {
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

import { useMemo, useState } from 'react'
import { ALL_CONTENT } from '@/content'
import { makeSearch } from '@/lib/search'
import { exportAutoText, exportMarkdown, downloadText } from '@/lib/export'

function abbrev(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? title).slice(0, 3).toUpperCase()
}

export function Library() {
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const fuse = useMemo(() => makeSearch(ALL_CONTENT), [])
  const results = q.trim() ? fuse.search(q).map((r) => r.item) : ALL_CONTENT
  const selected = ALL_CONTENT.find((c) => c.id === selectedId)

  return (
    <div className="workbench two">
      <aside className="pane library no-print">
        <div className="lib-head">
          <div className="lib-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all templates…" />
          </div>
        </div>
        <div className="lib-group">
          {results.map((c) => (
            <button
              key={c.id}
              className={'proc-card' + (selectedId === c.id ? ' on' : '')}
              onClick={() => {
                setSelectedId(c.id)
                setDrawerOpen(true)
              }}
            >
              <span className="pc-icon">{abbrev(c.title)}</span>
              <span className="pc-body">
                <span className="pc-name">{c.title}</span>
                <span className="pc-desc">{c.description ?? c.category}</span>
              </span>
            </button>
          ))}
          <p style={{ padding: '8px 4px', color: 'var(--faint)', fontSize: 12 }}>{results.length} items</p>
        </div>
      </aside>

      <section id="docs-pane" className={'pane output' + (drawerOpen ? ' open' : '')}>
        <button className="drawer-close" aria-label="Close" onClick={() => setDrawerOpen(false)}>
          ✕
        </button>
        {selected ? (
          <>
            <div className="out-toolbar no-print">
              <span className="out-kind">
                <span className="dot" />
                {selected.category}
              </span>
              <span className="spacer" />
              <button
                className="btn-primary"
                onClick={() =>
                  navigator.clipboard
                    .writeText(selected.rawBody)
                    .catch(() => window.prompt('Copy manually:', selected.rawBody))
                }
              >
                Copy
              </button>
              <button className="btn-sm" onClick={() => downloadText(`${selected.id}.txt`, selected.rawBody)}>
                .txt
              </button>
              <button className="btn-sm" onClick={() => exportMarkdown(selected)}>
                .md
              </button>
              <button className="btn-sm" onClick={() => exportAutoText(ALL_CONTENT)}>
                Auto Text
              </button>
            </div>
            <div className="out-scroll">
              <div className="config-hero" style={{ marginBottom: 12 }}>
                <h1 style={{ fontSize: 18 }}>{selected.title}</h1>
                {selected.description && <p style={{ fontSize: 13 }}>{selected.description}</p>}
                {selected.dotPhrase && (
                  <p style={{ fontSize: 12, color: 'var(--faint)' }}>
                    EHR Auto Text: <span style={{ fontFamily: 'var(--mono)' }}>{selected.dotPhrase}</span>
                  </p>
                )}
              </div>
              <pre className="emr">{selected.rawBody}</pre>
            </div>
          </>
        ) : (
          <div className="empty-out">
            <div>
              <div className="eo-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 6h16M4 12h16M4 18h10" />
                </svg>
              </div>
              <p>Select an item to view, copy, or export it.</p>
            </div>
          </div>
        )}
      </section>

      {drawerOpen && <div className="drawer-backdrop no-print" onClick={() => setDrawerOpen(false)} />}
      {selected && (
        <button
          className="drawer-toggle no-print"
          aria-controls="docs-pane"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          View
        </button>
      )}
    </div>
  )
}

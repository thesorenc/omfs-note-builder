import { useMemo, useState } from 'react'
import type { ParsedComponent } from '@/lib/types'
import { makeSearch } from '@/lib/search'

function groupByCategory(items: ParsedComponent[]) {
  const map = new Map<string, ParsedComponent[]>()
  for (const c of items) {
    const arr = map.get(c.category) ?? []
    arr.push(c)
    map.set(c.category, arr)
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
}

/** Short monospace code for the card icon, derived from the title. */
function abbrev(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? title).slice(0, 3).toUpperCase()
}

export function Picker({
  items,
  selected,
  onToggle,
  multi = false,
}: {
  items: ParsedComponent[]
  selected: string[]
  onToggle: (id: string) => void
  multi?: boolean
}) {
  const [q, setQ] = useState('')
  const fuse = useMemo(() => makeSearch(items), [items])
  const filtered = q.trim() ? fuse.search(q).map((r) => r.item) : items
  const groups = groupByCategory(filtered)

  return (
    <>
      <div className="lib-head">
        <div className="lib-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search procedures…" />
        </div>
      </div>
      {groups.map(([cat, list]) => (
        <div className="lib-group" key={cat}>
          <h4>{cat}</h4>
          {list.map((c) => {
            const on = selected.includes(c.id)
            return (
              <button
                key={c.id}
                className={'proc-card' + (on ? ' on' : '')}
                onClick={() => onToggle(c.id)}
              >
                <span className="pc-icon">{abbrev(c.title)}</span>
                <span className="pc-body">
                  <span className="pc-name">{c.title}</span>
                  <span className="pc-desc">{c.dotPhrase ?? c.category}</span>
                </span>
                {on && multi ? (
                  <span className="pc-count">✓</span>
                ) : (
                  <span className="pc-add">{on ? '✓' : '+'}</span>
                )}
              </button>
            )
          })}
        </div>
      ))}
      {!filtered.length && <p style={{ padding: '0 16px', color: 'var(--muted)', fontSize: 13 }}>No matches.</p>}
    </>
  )
}

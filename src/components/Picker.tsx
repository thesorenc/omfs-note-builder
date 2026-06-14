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
    <div className="space-y-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search templates..."
        className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
        {groups.map(([cat, list]) => (
          <div key={cat}>
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {cat}
            </div>
            <div className="space-y-1">
              {list.map((c) => {
                const active = selected.includes(c.id)
                return (
                  <button
                    key={c.id}
                    onClick={() => onToggle(c.id)}
                    className={`flex w-full items-center gap-2 rounded border px-3 py-2 text-left text-sm ${
                      active
                        ? 'border-sky-500 bg-sky-50 text-sky-900'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    {multi && (
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] ${
                          active ? 'border-sky-600 bg-sky-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {active ? '✓' : ''}
                      </span>
                    )}
                    <span className="flex-1">{c.title}</span>
                    {c.dotPhrase && (
                      <span className="font-mono text-[11px] text-slate-400">{c.dotPhrase}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        {!filtered.length && <p className="text-sm text-slate-500">No matches.</p>}
      </div>
    </div>
  )
}

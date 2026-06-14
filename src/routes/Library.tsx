import { useMemo, useState } from 'react'
import { ALL_CONTENT } from '@/content'
import { makeSearch } from '@/lib/search'
import { exportAutoText, exportMarkdown, downloadText } from '@/lib/export'

export function Library() {
  const [q, setQ] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')
  const fuse = useMemo(() => makeSearch(ALL_CONTENT), [])
  const results = q.trim() ? fuse.search(q).map((r) => r.item) : ALL_CONTENT
  const selected = ALL_CONTENT.find((c) => c.id === selectedId)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <aside>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Library</h2>
          <button
            onClick={() => exportAutoText(ALL_CONTENT)}
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100"
          >
            Export Auto Text
          </button>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all templates and components..."
          className="mb-3 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
        />
        <div className="max-h-[70vh] space-y-1 overflow-y-auto pr-1">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedId(c.id)}
              className={`flex w-full items-center justify-between gap-2 rounded border px-3 py-2 text-left text-sm ${
                selectedId === c.id
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="flex-1">{c.title}</span>
              <span className="text-[11px] text-slate-400">{c.category}</span>
            </button>
          ))}
          <p className="px-1 py-2 text-xs text-slate-400">{results.length} items</p>
        </div>
      </aside>

      <section>
        {selected ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex-1 text-base font-semibold text-slate-800">{selected.title}</h3>
              {selected.dotPhrase && (
                <span className="font-mono text-xs text-slate-500">{selected.dotPhrase}</span>
              )}
              <button
                onClick={() => navigator.clipboard.writeText(selected.rawBody).catch(() => window.prompt('Copy manually:', selected.rawBody))}
                className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
              >
                Copy
              </button>
              <button
                onClick={() => downloadText(`${selected.id}.txt`, selected.rawBody)}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
              >
                Download .txt
              </button>
              <button
                onClick={() => exportMarkdown(selected)}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-sm hover:bg-slate-100"
              >
                Download .md
              </button>
            </div>
            <div className="text-xs text-slate-400">Source: {selected.sourcePath}</div>
            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {selected.tags.map((t) => (
                  <span key={t} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                    {t}
                  </span>
                ))}
              </div>
            )}
            <pre className="whitespace-pre-wrap rounded border border-slate-200 bg-white p-4 font-mono text-sm">
              {selected.rawBody}
            </pre>
          </div>
        ) : (
          <p className="text-slate-500">Select an item to view, copy, or export it.</p>
        )}
      </section>
    </div>
  )
}

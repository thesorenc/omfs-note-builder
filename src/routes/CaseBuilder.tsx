import { useMemo, useState } from 'react'
import { PROCEDURES, procedureById, contentById } from '@/lib/procedures'
import { buildDocument, type DocKind } from '@/lib/caseAssembly'
import { useCaseStore } from '@/state/useCaseStore'
import { FieldRenderer } from '@/components/FieldRenderer'
import { OutputPanel } from '@/components/OutputPanel'
import { EncounterBar } from '@/components/EncounterBar'

function abbrev(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? title).slice(0, 3).toUpperCase()
}

function visibleFields(componentId: string) {
  const c = contentById(componentId)
  if (!c) return []
  const seenLink = new Set<string>()
  return c.fields.filter((f) => {
    if (f.linkKey) {
      if (seenLink.has(f.linkKey)) return false
      seenLink.add(f.linkKey)
    }
    return true
  })
}

const TABS: { kind: DocKind; label: string }[] = [
  { kind: 'opnote', label: 'Operative Note' },
  { kind: 'preop', label: 'Pre-op' },
  { kind: 'postop', label: 'Post-op' },
  { kind: 'rx', label: 'Rx' },
]

export function CaseBuilder() {
  const { items, values, encounter, add, remove, setValue, setEncounter, countOf } = useCaseStore()
  const [tab, setTab] = useState<DocKind>('opnote')
  const [q, setQ] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const groups = useMemo(() => {
    const filtered = q.trim()
      ? PROCEDURES.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
      : PROCEDURES
    const map = new Map<string, typeof PROCEDURES>()
    for (const p of filtered) {
      const arr = map.get(p.category) ?? []
      arr.push(p)
      map.set(p.category, arr)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [q])

  const doc = useMemo(
    () => buildDocument(items, values, encounter, tab),
    [items, values, encounter, tab],
  )

  return (
    <div className="workbench">
      {/* Library of procedures */}
      <aside className="pane library no-print">
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
            {list.map((p) => {
              const count = countOf(p.id)
              return (
                <button key={p.id} className="proc-card" onClick={() => add(p.id)}>
                  <span className="pc-icon">{abbrev(p.name)}</span>
                  <span className="pc-body">
                    <span className="pc-name">{p.name}</span>
                    <span className="pc-desc">{p.category}</span>
                  </span>
                  {count > 0 ? <span className="pc-count">{count}</span> : <span className="pc-add">+</span>}
                </button>
              )
            })}
          </div>
        ))}
      </aside>

      {/* Case builder */}
      <section className="pane config no-print">
        <div className="config-inner">
          <div className="config-hero">
            <h1>Case builder</h1>
            <p>
              Add procedures from the library and fill the variables. The Op Note, Post-op, and Rx
              documents on the right update instantly. Identifiers stay as EHR placeholders.
            </p>
          </div>

          <EncounterBar value={encounter} onChange={setEncounter} />

          {items.length === 0 ? (
            <div className="case-empty">
              <div className="ce-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </div>
              <h3>No procedures yet</h3>
              <p>Pick one or more procedures from the library to start building the case.</p>
            </div>
          ) : (
            items.map((item, idx) => {
              const proc = procedureById(item.procedureId)
              if (!proc) return null
              const fields = visibleFields(proc.opTemplateId)
              return (
                <div className="proc-block" key={item.instanceId}>
                  <div className="proc-block-head">
                    <span className="pbh-icon">{abbrev(proc.name)}</span>
                    <div className="pbh-title">
                      <div className="t">
                        {proc.name} — #{idx + 1}
                      </div>
                      <div className="s">{proc.category}</div>
                    </div>
                    <button className="res-x" title="Remove" onClick={() => remove(item.instanceId)}>
                      ✕
                    </button>
                  </div>
                  <div className="proc-block-body">
                    {proc.review && (
                      <div className="flag-note smartlink">
                        Post-op / Rx pairing for this procedure is a best guess — review before use.
                      </div>
                    )}
                    {fields.length ? (
                      <div className="field-grid">
                        {fields.map((f) => (
                          <FieldRenderer
                            key={f.id}
                            field={f}
                            values={values}
                            setValue={setValue}
                            scope={item.instanceId}
                          />
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                        No fillable variables — ready as-is.
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Documents */}
      <section id="docs-pane" className={'pane output' + (drawerOpen ? ' open' : '')}>
        <div className="out-head no-print" role="tablist" aria-label="Documents">
          {TABS.map((t) => (
            <button
              key={t.kind}
              role="tab"
              aria-selected={tab === t.kind}
              className="out-tab"
              onClick={() => setTab(t.kind)}
            >
              {t.label}
            </button>
          ))}
          <span style={{ flex: 1 }} />
          <button className="drawer-close" aria-label="Close documents" onClick={() => setDrawerOpen(false)}>
            ✕
          </button>
        </div>
        {items.length === 0 ? (
          <div className="empty-out">
            <div>
              <div className="eo-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                </svg>
              </div>
              <p>Add a procedure to generate the Operative Note, Pre-op, Post-op handout, and Rx.</p>
            </div>
          </div>
        ) : (
          <OutputPanel
            key={tab}
            text={doc.text}
            flags={doc.flags}
            smartlinks={doc.smartlinks}
            filename={`${tab}.txt`}
            patientFacing={tab === 'postop' || tab === 'preop'}
          />
        )}
      </section>

      {drawerOpen && <div className="drawer-backdrop no-print" onClick={() => setDrawerOpen(false)} />}
      <button
        className="drawer-toggle no-print"
        aria-controls="docs-pane"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        Documents
      </button>
    </div>
  )
}

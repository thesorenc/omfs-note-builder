import { useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ParsedComponent } from '@/lib/types'
import type { AssembleOptions } from '@/lib/assembler'
import { assemble } from '@/lib/assembler'
import { useFormStore } from '@/state/useFormStore'
import { usePrefs } from '@/state/usePrefs'
import { resolveInclude } from '@/lib/resolve'
import { FieldRenderer } from './FieldRenderer'
import { OutputPanel } from './OutputPanel'

/** Dedupe linked side fields so one toggle drives them all. */
function visibleFields(c: ParsedComponent) {
  const seenLink = new Set<string>()
  return c.fields.filter((f) => {
    if (f.linkKey) {
      if (seenLink.has(f.linkKey)) return false
      seenLink.add(f.linkKey)
    }
    return true
  })
}

function abbrev(title: string): string {
  const words = title.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase()
  return (words[0] ?? title).slice(0, 3).toUpperCase()
}

export function NoteAssembler({
  components,
  options,
  filename = 'note.txt',
  patientFacing = false,
  resolveIncludes = false,
  heroTitle,
  heroSub,
  encounter,
  prependText = '',
}: {
  components: ParsedComponent[]
  options?: AssembleOptions
  filename?: string
  patientFacing?: boolean
  resolveIncludes?: boolean
  heroTitle?: string
  heroSub?: string
  encounter?: ReactNode
  prependText?: string
}) {
  const values = useFormStore((s) => s.values)
  const resetAll = useFormStore((s) => s.resetAll)
  const unfilledPolicy = usePrefs((s) => s.unfilledPolicy)

  const optKey = JSON.stringify(options ?? {})
  const result = useMemo(() => {
    const opts: AssembleOptions = { unfilledPolicy, ...options }
    const parts = components.map((c) =>
      assemble(c, values, opts, resolveIncludes ? resolveInclude : undefined),
    )
    const body = parts.map((p) => p.text.trimEnd()).join('\n\n')
    return {
      text: (prependText ? prependText.trimEnd() + '\n\n' : '') + body,
      flags: parts.flatMap((p) => p.flags),
      smartlinks: Array.from(new Set(parts.flatMap((p) => p.smartlinks))),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, values, optKey, unfilledPolicy, resolveIncludes, prependText])

  return (
    <>
      <section className="pane config no-print">
        <div className="config-inner">
          {(heroTitle || heroSub) && (
            <div className="config-hero">
              {heroTitle && <h1>{heroTitle}</h1>}
              {heroSub && <p>{heroSub}</p>}
            </div>
          )}
          {encounter}
          {components.map((c) => {
            const fields = visibleFields(c)
            return (
              <div className="proc-block" key={c.id}>
                <div className="proc-block-head">
                  <span className="pbh-icon">{abbrev(c.title)}</span>
                  <div className="pbh-title">
                    <div className="t">{c.title}</div>
                    <div className="s">{c.category}</div>
                  </div>
                </div>
                <div className="proc-block-body">
                  {fields.length ? (
                    <div className="field-grid">
                      {fields.map((f) => (
                        <FieldRenderer key={f.id} field={f} />
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>
                      No fillable fields — ready to copy as-is.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
          <div style={{ marginTop: 4 }}>
            <button className="btn ghost" onClick={resetAll}>
              Reset fields
            </button>
          </div>
        </div>
      </section>

      <section className="pane output">
        <OutputPanel
          text={result.text}
          smartlinks={result.smartlinks}
          flags={result.flags}
          filename={filename}
          patientFacing={patientFacing}
        />
      </section>
    </>
  )
}

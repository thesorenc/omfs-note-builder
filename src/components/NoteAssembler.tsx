import { useMemo } from 'react'
import type { ParsedComponent } from '@/lib/types'
import type { AssembleOptions } from '@/lib/assembler'
import { assemble } from '@/lib/assembler'
import { useFormStore } from '@/state/useFormStore'
import { usePrefs } from '@/state/usePrefs'
import { resolveInclude } from '@/lib/resolve'
import { FieldRenderer } from './FieldRenderer'
import { OutputPanel } from './OutputPanel'
import { FlagBanner } from './FlagBanner'

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

export function NoteAssembler({
  components,
  options,
  filename = 'note.txt',
  patientFacing = false,
  resolveIncludes = false,
}: {
  components: ParsedComponent[]
  options?: AssembleOptions
  filename?: string
  patientFacing?: boolean
  resolveIncludes?: boolean
}) {
  const values = useFormStore((s) => s.values)
  const resetAll = useFormStore((s) => s.resetAll)
  const unfilledPolicy = usePrefs((s) => s.unfilledPolicy)
  const setUnfilledPolicy = usePrefs((s) => s.setUnfilledPolicy)

  // Stable dep: options is usually a fresh object literal from the caller.
  const optKey = JSON.stringify(options ?? {})
  const result = useMemo(() => {
    const opts: AssembleOptions = { unfilledPolicy, ...options }
    const parts = components.map((c) =>
      assemble(c, values, opts, resolveIncludes ? resolveInclude : undefined),
    )
    return {
      text: parts.map((p) => p.text.trimEnd()).join('\n\n'),
      flags: parts.flatMap((p) => p.flags),
      smartlinks: Array.from(new Set(parts.flatMap((p) => p.smartlinks))),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [components, values, optKey, unfilledPolicy, resolveIncludes])

  const hasFields = components.some((c) => visibleFields(c).length > 0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="no-print space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Fill in</h3>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={unfilledPolicy === 'blank'}
                onChange={(e) => setUnfilledPolicy(e.target.checked ? 'blank' : 'keepRaw')}
              />
              blank unfilled
            </label>
            <button onClick={resetAll} className="underline hover:text-slate-700">
              reset
            </button>
          </div>
        </div>
        {!hasFields && (
          <p className="text-sm text-slate-500">
            No fillable fields - this template is ready to copy as-is.
          </p>
        )}
        {components.map((c) => {
          const fields = visibleFields(c)
          if (!fields.length) return null
          return (
            <div key={c.id} className="space-y-3">
              {components.length > 1 && (
                <h4 className="border-b border-slate-200 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {c.title}
                </h4>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {fields.map((f) => (
                  <FieldRenderer key={f.id} field={f} />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="space-y-3">
        <FlagBanner flags={result.flags} />
        <OutputPanel
          text={result.text}
          smartlinks={result.smartlinks}
          filename={filename}
          patientFacing={patientFacing}
        />
      </div>
    </div>
  )
}

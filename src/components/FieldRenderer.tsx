import type { Field } from '@/lib/types'
import { useFormStore } from '@/state/useFormStore'
import { canonicalSide, valueKey } from '@/lib/assembler'

const inputCls =
  'w-full rounded border border-slate-300 px-2 py-1 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500'

export function FieldRenderer({ field }: { field: Field }) {
  const values = useFormStore((s) => s.values)
  const setValue = useFormStore((s) => s.setValue)

  if (field.kind === 'side') {
    const key = valueKey(field)
    const current = values[key]
    const opts = field.options ?? ['right', 'left']
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
        <div className="inline-flex overflow-hidden rounded border border-slate-300">
          {opts.map((opt) => {
            const canon = canonicalSide(opt)
            const active = current === canon
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(key, canon)}
                className={`px-3 py-1 text-sm ${active ? 'bg-sky-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (field.kind === 'hardwareDim') {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
        <div className="flex items-center gap-1">
          <input
            className={inputCls}
            placeholder="diameter"
            inputMode="decimal"
            value={values[`${field.id}:d`] ?? ''}
            onChange={(e) => setValue(`${field.id}:d`, e.target.value)}
          />
          <span className="text-slate-500">x</span>
          <input
            className={inputCls}
            placeholder="length"
            inputMode="decimal"
            value={values[`${field.id}:l`] ?? ''}
            onChange={(e) => setValue(`${field.id}:l`, e.target.value)}
          />
        </div>
      </div>
    )
  }

  if (field.kind === 'enumText') {
    const opts = field.options ?? []
    const v = values[field.id] ?? ''
    const isOther = v !== '' && !opts.includes(v)
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">{field.label}</label>
        <select
          className={inputCls}
          value={isOther ? '__other__' : v}
          onChange={(e) => setValue(field.id, e.target.value === '__other__' ? ' ' : e.target.value)}
        >
          <option value="">- select -</option>
          {opts.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
          <option value="__other__">Other...</option>
        </select>
        {isOther && (
          <input
            className={`${inputCls} mt-1`}
            placeholder="custom value"
            value={v.trim()}
            onChange={(e) => setValue(field.id, e.target.value)}
            autoFocus
          />
        )}
      </div>
    )
  }

  const isNumber = field.kind === 'measurement' || field.kind === 'hardwareCount'
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-600">
        {field.label}
        {field.unit ? <span className="text-slate-400"> ({field.unit})</span> : null}
      </label>
      <input
        className={inputCls}
        inputMode={isNumber ? 'decimal' : 'text'}
        placeholder={field.hint ?? field.raw}
        value={values[field.id] ?? ''}
        onChange={(e) => setValue(field.id, e.target.value)}
      />
    </div>
  )
}

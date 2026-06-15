import type { ReactNode } from 'react'
import type { Field } from '@/lib/types'
import { useFormStore } from '@/state/useFormStore'
import { canonicalSide, valueKey } from '@/lib/assembler'

export function FieldRenderer({ field }: { field: Field }) {
  const values = useFormStore((s) => s.values)
  const setValue = useFormStore((s) => s.setValue)

  let control: ReactNode

  if (field.kind === 'side') {
    const key = valueKey(field)
    const current = values[key]
    const opts = field.options ?? ['right', 'left']
    control = (
      <div className="chips">
        {opts.map((opt) => {
          const canon = canonicalSide(opt)
          const on = current === canon
          return (
            <button
              key={opt}
              type="button"
              className={'chip' + (on ? ' on' : '')}
              onClick={() => setValue(key, canon)}
            >
              <span className="ck">✓</span>
              {opt}
            </button>
          )
        })}
      </div>
    )
  } else if (field.kind === 'enumText') {
    const opts = field.options ?? []
    const v = values[field.id] ?? ''
    const isOther = v !== '' && !opts.includes(v)
    control = (
      <div className="field" style={{ gap: 7 }}>
        <div className="chips">
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              className={'chip' + (v === o ? ' on' : '')}
              onClick={() => setValue(field.id, o)}
            >
              <span className="ck">✓</span>
              {o}
            </button>
          ))}
          <button
            type="button"
            className={'chip' + (isOther ? ' on' : '')}
            onClick={() => setValue(field.id, isOther ? '' : ' ')}
          >
            Other…
          </button>
        </div>
        {isOther && (
          <input
            className="f-input"
            autoFocus
            placeholder="custom value"
            value={v.trim()}
            onChange={(e) => setValue(field.id, e.target.value)}
          />
        )}
      </div>
    )
  } else if (field.kind === 'hardwareDim') {
    control = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          className="f-input mono"
          style={{ width: 90 }}
          placeholder="Ø"
          inputMode="decimal"
          value={values[`${field.id}:d`] ?? ''}
          onChange={(e) => setValue(`${field.id}:d`, e.target.value)}
        />
        <span style={{ color: 'var(--muted)' }}>×</span>
        <input
          className="f-input mono"
          style={{ width: 90 }}
          placeholder="length"
          inputMode="decimal"
          value={values[`${field.id}:l`] ?? ''}
          onChange={(e) => setValue(`${field.id}:l`, e.target.value)}
        />
      </div>
    )
  } else if (field.kind === 'hardwareCount') {
    const v = parseInt(values[field.id] ?? '', 10)
    const set = (n: number) => setValue(field.id, String(Math.max(0, n)))
    control = (
      <div className="stepper">
        <button type="button" onClick={() => set((isNaN(v) ? 0 : v) - 1)}>
          –
        </button>
        <input
          inputMode="numeric"
          value={values[field.id] ?? ''}
          onChange={(e) => setValue(field.id, e.target.value)}
        />
        <button type="button" onClick={() => set((isNaN(v) ? 0 : v) + 1)}>
          +
        </button>
      </div>
    )
  } else {
    // measurement / toothNumber / text / blank
    const mono = field.kind === 'measurement' || field.kind === 'toothNumber'
    control = (
      <input
        className={'f-input' + (mono ? ' mono' : '')}
        inputMode={field.kind === 'measurement' ? 'decimal' : 'text'}
        placeholder={field.hint ?? field.raw}
        value={values[field.id] ?? ''}
        onChange={(e) => setValue(field.id, e.target.value)}
      />
    )
  }

  return (
    <div className="field">
      <label className="f-label">
        {field.label}
        {field.unit ? <span className="f-hint">{field.unit}</span> : null}
      </label>
      {control}
    </div>
  )
}

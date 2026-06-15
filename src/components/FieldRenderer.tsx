import { useRef, type ReactNode } from 'react'
import type { Field } from '@/lib/types'
import { canonicalSide, valueKey } from '@/lib/assembler'

const UPPER = Array.from({ length: 16 }, (_, i) => i + 1) // 1..16
const LOWER = Array.from({ length: 16 }, (_, i) => 32 - i) // 32..17
const THIRDS = new Set([1, 16, 17, 32])

function parseTeeth(v: string): Set<number> {
  return new Set(
    (v || '')
      .split(/[,\s]+/)
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n)),
  )
}

// Teeth in DOM/tab order: upper arch (1..16) then lower arch (32..17).
const TOOTH_ORDER = [...UPPER, ...LOWER]

function ToothPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const sel = parseTeeth(value)
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([])
  const emit = (s: Set<number>) => onChange([...s].sort((a, b) => a - b).join(', '))
  const toggle = (n: number) => {
    const s = new Set(sel)
    if (s.has(n)) s.delete(n)
    else s.add(n)
    emit(s)
  }
  const addAll = (list: number[]) => {
    const s = new Set(sel)
    list.forEach((n) => s.add(n))
    emit(s)
  }
  // Roving tabindex: the first selected tooth (or tooth #1 if none) is the single
  // tab stop; arrows move focus within the grid. The two arches are a 16-col layout,
  // so Up/Down step by 16 across arches; Left/Right walk the full sequence.
  const activeOrderIdx = (() => {
    const first = TOOTH_ORDER.findIndex((n) => sel.has(n))
    return first === -1 ? 0 : first
  })()
  const focusTooth = (orderIdx: number) => {
    const clamped = Math.max(0, Math.min(TOOTH_ORDER.length - 1, orderIdx))
    btnRefs.current[clamped]?.focus()
  }
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, orderIdx: number) => {
    let next: number
    if (e.key === 'ArrowRight') next = (orderIdx + 1) % TOOTH_ORDER.length
    else if (e.key === 'ArrowLeft') next = (orderIdx - 1 + TOOTH_ORDER.length) % TOOTH_ORDER.length
    else if (e.key === 'ArrowDown') next = orderIdx + 16
    else if (e.key === 'ArrowUp') next = orderIdx - 16
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = TOOTH_ORDER.length - 1
    else return
    if (next < 0 || next >= TOOTH_ORDER.length) return
    e.preventDefault()
    focusTooth(next)
  }
  const Tooth = ({ n }: { n: number }) => {
    const orderIdx = TOOTH_ORDER.indexOf(n)
    return (
      <button
        type="button"
        ref={(el) => {
          btnRefs.current[orderIdx] = el
        }}
        className={'tooth' + (sel.has(n) ? ' on' : '') + (THIRDS.has(n) ? ' third' : '')}
        aria-pressed={sel.has(n)}
        aria-label={`Tooth ${n}`}
        tabIndex={orderIdx === activeOrderIdx ? 0 : -1}
        onKeyDown={(e) => onKeyDown(e, orderIdx)}
        onClick={() => toggle(n)}
      >
        {n}
      </button>
    )
  }
  return (
    <div className="tooth-picker">
      <div className="arch-label">Upper · Right → Left</div>
      <div className="tooth-row">{UPPER.map((n) => <Tooth key={n} n={n} />)}</div>
      <div className="tooth-row lower">{LOWER.map((n) => <Tooth key={n} n={n} />)}</div>
      <div className="arch-label" style={{ marginTop: 7 }}>Lower · Right → Left</div>
      <div className="tp-quick">
        <button type="button" onClick={() => addAll([1, 16, 17, 32])}>All four 3rds</button>
        <button type="button" onClick={() => addAll(UPPER)}>+ Uppers</button>
        <button type="button" onClick={() => addAll(LOWER)}>+ Lowers</button>
        <button type="button" onClick={() => onChange('')}>Clear</button>
      </div>
      <div className="tp-summary">
        {sel.size ? (
          <span>Selected: <b>{[...sel].sort((a, b) => a - b).join(', ')}</b></span>
        ) : (
          <span>No teeth selected yet.</span>
        )}
      </div>
    </div>
  )
}

/** Store-agnostic field control. `scope` namespaces keys per case instance. */
export function FieldRenderer({
  field,
  values,
  setValue,
  scope,
}: {
  field: Field
  values: Record<string, string>
  setValue: (key: string, value: string) => void
  scope?: string
}) {
  const k = (key: string) => (scope ? `${scope}::${key}` : key)
  const labelId = `lbl-${k(field.id)}`.replace(/[^a-zA-Z0-9-]/g, '_')
  const inputId = `in-${k(field.id)}`.replace(/[^a-zA-Z0-9-]/g, '_')

  let control: ReactNode
  let isGroup = false

  if (field.kind === 'side') {
    isGroup = true
    const key = k(valueKey(field))
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
              aria-pressed={on}
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
  } else if (field.kind === 'toothNumber') {
    isGroup = true
    control = <ToothPicker value={values[k(field.id)] ?? ''} onChange={(v) => setValue(k(field.id), v)} />
  } else if (field.kind === 'enumText') {
    isGroup = true
    const opts = field.options ?? []
    const key = k(field.id)
    const v = values[key] ?? ''
    const isOther = v !== '' && !opts.includes(v)
    control = (
      <div className="field" style={{ gap: 7 }}>
        <div className="chips">
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              aria-pressed={v === o}
              className={'chip' + (v === o ? ' on' : '')}
              onClick={() => setValue(key, o)}
            >
              <span className="ck">✓</span>
              {o}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={isOther}
            className={'chip' + (isOther ? ' on' : '')}
            onClick={() => setValue(key, isOther ? '' : ' ')}
          >
            Other…
          </button>
        </div>
        {isOther && (
          <input
            className="f-input"
            autoFocus
            aria-label={`${field.label} (custom)`}
            placeholder="custom value"
            value={v.trim()}
            onChange={(e) => setValue(key, e.target.value)}
          />
        )}
      </div>
    )
  } else if (field.kind === 'hardwareDim') {
    isGroup = true
    control = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          className="f-input mono"
          style={{ width: 90 }}
          placeholder="Ø"
          aria-label={`${field.label} diameter`}
          inputMode="decimal"
          value={values[k(`${field.id}:d`)] ?? ''}
          onChange={(e) => setValue(k(`${field.id}:d`), e.target.value)}
        />
        <span style={{ color: 'var(--muted)' }}>×</span>
        <input
          className="f-input mono"
          style={{ width: 90 }}
          placeholder="length"
          aria-label={`${field.label} length`}
          inputMode="decimal"
          value={values[k(`${field.id}:l`)] ?? ''}
          onChange={(e) => setValue(k(`${field.id}:l`), e.target.value)}
        />
      </div>
    )
  } else if (field.kind === 'hardwareCount') {
    const key = k(field.id)
    const v = parseInt(values[key] ?? '', 10)
    const set = (n: number) => setValue(key, String(Math.max(0, n)))
    isGroup = true
    control = (
      <div className="stepper">
        <button type="button" aria-label="decrease" onClick={() => set((isNaN(v) ? 0 : v) - 1)}>–</button>
        <input
          inputMode="numeric"
          aria-label={field.label}
          value={values[key] ?? ''}
          onChange={(e) => setValue(key, e.target.value)}
        />
        <button type="button" aria-label="increase" onClick={() => set((isNaN(v) ? 0 : v) + 1)}>+</button>
      </div>
    )
  } else {
    const mono = field.kind === 'measurement'
    const key = k(field.id)
    control = (
      <input
        id={inputId}
        className={'f-input' + (mono ? ' mono' : '')}
        inputMode={field.kind === 'measurement' ? 'decimal' : 'text'}
        placeholder={field.hint ?? field.raw}
        value={values[key] ?? ''}
        onChange={(e) => setValue(key, e.target.value)}
      />
    )
  }

  return (
    <div className="field" role={isGroup ? 'group' : undefined} aria-labelledby={isGroup ? labelId : undefined}>
      <label className="f-label" id={labelId} htmlFor={isGroup ? undefined : inputId}>
        {field.label}
        {field.unit ? <span className="f-hint">{field.unit}</span> : null}
      </label>
      {control}
    </div>
  )
}

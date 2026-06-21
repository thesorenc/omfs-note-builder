import { useState } from 'react'
import { PE_SYSTEMS, ROS_SYSTEMS } from '@/lib/exam/content'
import type { ExamElement, ExamOption } from '@/lib/exam/types'
import { useExamStore, type Section } from '@/state/useExamStore'
import { ToothPicker } from '@/components/FieldRenderer'

const SIDES = ['right', 'left', 'bilateral'] as const
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
const splitList = (v: string) => (v ? v.split(', ').filter(Boolean) : [])
const toggleInList = (v: string, item: string) => {
  const a = splitList(v)
  const i = a.indexOf(item)
  if (i >= 0) a.splice(i, 1)
  else a.push(item)
  return a.join(', ')
}

type Mark = '+' | '-'
type Follow = 'text' | 'mm' | 'teeth' | 'gcs' | 'trigeminal'
type Getter = (sub?: string) => string
type Setter = (sub: string | undefined, value: string) => void
interface Choice { key: string; label: string; mark: Mark; value?: string }

const GCS_PARTS = [
  { label: 'Eye', sub: 'e', range: [1, 2, 3, 4] },
  { label: 'Verbal', sub: 'v', range: [1, 2, 3, 4, 5] },
  { label: 'Motor', sub: 'm', range: [1, 2, 3, 4, 5, 6] },
]
const TRIG_NERVES: ExamOption[] = [
  { value: 'V1', label: 'V1' }, { value: 'V2', label: 'V2' }, { value: 'V3', label: 'V3' },
  { value: 'infraorbital', label: 'Infraorbital' }, { value: 'IAN', label: 'IAN' }, { value: 'mental', label: 'Mental' },
  { value: 'lingual', label: 'Lingual' }, { value: 'buccal', label: 'Buccal' },
]
const TRIG_TYPES: ExamOption[] = [
  { value: 'paresthesia', label: 'Paresthesia' }, { value: 'anesthesia', label: 'Anesthesia' }, { value: 'dysesthesia', label: 'Dysesthesia' },
]

/** The choices shown as buttons for an element. choices[0] is always the pertinent
 *  negative ('-'); the rest are positives ('+', some carrying a value, some a reveal). */
function deriveChoices(el: ExamElement): { choices: Choice[]; multi: boolean; dropdown: boolean } {
  const neg: Choice = { key: 'neg', label: el.normalLabel ?? 'Absent', mark: '-' }
  let positives: Choice[]
  let multi = false
  if (el.control === 'select' || el.control === 'multiselect') {
    multi = el.control === 'multiselect'
    positives = (el.options ?? []).map((o) => ({ key: o.value, label: o.label, mark: '+', value: o.value }))
  } else if (el.control === 'measure') positives = [{ key: 'pos', label: el.posLabel ?? 'Value', mark: '+' }]
  else if (el.control === 'teeth') positives = [{ key: 'pos', label: el.posLabel ?? 'Teeth…', mark: '+' }]
  else if (el.control === 'gcs') positives = [{ key: 'pos', label: el.posLabel ?? 'Score…', mark: '+' }]
  else if (el.control === 'trigeminal') positives = [{ key: 'pos', label: el.posLabel ?? 'Deficit…', mark: '+' }]
  else if (el.detail === 'side') positives = SIDES.map((s) => ({ key: s, label: cap(s), mark: '+', value: s }))
  else if (el.detail === 'text' || el.detail === 'tooth' || el.detail === 'mm') positives = [{ key: 'pos', label: el.posLabel ?? (el.detail === 'mm' ? 'Value' : 'Present'), mark: '+' }]
  else positives = [{ key: 'pos', label: el.posLabel ?? 'Present', mark: '+' }]
  const choices = [neg, ...positives]
  return { choices, multi, dropdown: el.dropdown ?? (!multi && choices.length > 5) }
}

function revealKind(el: ExamElement): Follow | null {
  if (el.control === 'measure') return 'mm'
  if (el.control === 'teeth') return 'teeth'
  if (el.control === 'gcs') return 'gcs'
  if (el.control === 'trigeminal') return 'trigeminal'
  if (el.control === 'select' || el.control === 'multiselect') return null
  if (el.detail === 'text' || el.detail === 'tooth') return 'text'
  if (el.detail === 'mm') return 'mm'
  return null
}

/** Middle pane: edits one active system. Each element is a row of choice buttons (or a
 *  dropdown when there are many); '−' choices are pertinent negatives. Remounted per system. */
export function ExamSystemEditor({ section, systemId }: { section: Section; systemId: string }) {
  const [commentOpen, setCommentOpen] = useState(false)
  const system = (section === 'pe' ? PE_SYSTEMS : ROS_SYSTEMS).find((s) => s.id === systemId)
  const rec = useExamStore((s) => s[section][systemId])
  const selectChoice = useExamStore((s) => s.selectChoice)
  const setDetail = useExamStore((s) => s.setDetail)
  const setComment = useExamStore((s) => s.setComment)
  const allNegative = useExamStore((s) => s.allNegative)
  const clearSystem = useExamStore((s) => s.clearSystem)

  if (!system || !rec) return null

  return (
    <div className="proc-block">
      <div className="proc-block-head">
        <span className="pbh-icon">{system.abbr}</span>
        <div className="pbh-title">
          <div className="t">{system.name}</div>
          <div className="s">{section === 'pe' ? 'Physical exam' : 'Review of systems'}</div>
        </div>
      </div>
      <div className="proc-block-body">
        <div className="exam-actions">
          <button className="btn-sm" onClick={() => allNegative(section, systemId)}>All negative</button>
          <button className="btn-sm" onClick={() => clearSystem(section, systemId)}>Clear</button>
        </div>

        <div className="exam-rows">
          {system.elements.map((el) => (
            <ElementRow
              key={el.id}
              element={el}
              mark={rec.marks[el.id]}
              detail={rec.detail}
              onSelect={(mark, value) => selectChoice(section, systemId, el.id, mark, value)}
              onDetail={(sub, value) => setDetail(section, systemId, sub ? `${el.id}.${sub}` : el.id, value)}
              allowNote={section === 'pe'}
            />
          ))}
        </div>

        <CommentField open={commentOpen || rec.comment.trim().length > 0} value={rec.comment} onOpen={() => setCommentOpen(true)} onChange={(v) => setComment(section, systemId, v)} />
      </div>
    </div>
  )
}

function ElementRow({ element, mark, detail, onSelect, onDetail, allowNote }: {
  element: ExamElement
  mark: Mark | undefined
  detail: Record<string, string>
  onSelect: (mark: Mark | null, value?: string) => void
  onDetail: (sub: string | undefined, value: string) => void
  allowNote: boolean
}) {
  const { choices, multi, dropdown } = deriveChoices(element)
  const get: Getter = (sub) => detail[sub ? `${element.id}.${sub}` : element.id] ?? ''
  const val = get()
  const reveal = revealKind(element)

  return (
    <div className="exam-item">
      <div className="exam-choices">
        <span className="rs-label">{element.label}</span>
        {dropdown ? (
          <DropdownChoices choices={choices} mark={mark} val={val} onSelect={onSelect} />
        ) : multi ? (
          <MultiChoices choices={choices} mark={mark} val={val} onSelect={onSelect} />
        ) : (
          <ButtonChoices choices={choices} mark={mark} val={val} onSelect={onSelect} />
        )}
        {allowNote && mark && <ElemNote value={get('note')} onChange={(v) => onDetail('note', v)} />}
      </div>

      {mark === '+' && reveal === 'gcs' && <GcsControl get={get} set={onDetail} />}
      {mark === '+' && reveal === 'trigeminal' && <TrigeminalControl get={get} set={onDetail} />}
      {mark === '+' && (reveal === 'text' || reveal === 'mm' || reveal === 'teeth' || element.side || element.size) && (
        <div className="ex-detail wrap">
          {reveal === 'text' && <input className="d-text" value={val} placeholder={element.hint ?? 'specify'} aria-label={element.label} onChange={(e) => onDetail(undefined, e.target.value)} />}
          {reveal === 'mm' && (
            <>
              <Stepper value={val} onChange={(v) => onDetail(undefined, v)} ariaLabel={`${element.label} (${element.unit ?? 'mm'})`} />
              <span className="d-label">{element.unit ?? 'mm'}</span>
            </>
          )}
          {reveal === 'teeth' && <ToothPicker value={val} onChange={(v) => onDetail(undefined, v)} />}
          {element.side && <SideSeg value={get('side')} onChange={(v) => onDetail('side', v)} />}
          {element.size && (
            <span className="size-in">
              <input className="d-text" inputMode="decimal" style={{ minWidth: 56 }} placeholder="size" aria-label={`${element.label} size`} value={get('size')} onChange={(e) => onDetail('size', e.target.value)} />
              <span className="d-label">cm</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function ButtonChoices({ choices, mark, val, onSelect }: { choices: Choice[]; mark: Mark | undefined; val: string; onSelect: (mark: Mark | null, value?: string) => void }) {
  return (
    <div className="choice-row">
      {choices.map((c) => {
        const active = c.mark === '-' ? mark === '-' : c.value !== undefined ? mark === '+' && val === c.value : mark === '+'
        return (
          <button key={c.key} type="button" aria-pressed={active} className={'choice' + (active ? (c.mark === '-' ? ' neg-on' : ' on') : '')} onClick={() => (active ? onSelect(null) : onSelect(c.mark, c.value))}>
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function MultiChoices({ choices, mark, val, onSelect }: { choices: Choice[]; mark: Mark | undefined; val: string; onSelect: (mark: Mark | null, value?: string) => void }) {
  const list = mark === '+' ? splitList(val) : []
  const [neg, ...opts] = choices
  return (
    <div className="choice-row">
      <button type="button" aria-pressed={mark === '-'} className={'choice' + (mark === '-' ? ' neg-on' : '')} onClick={() => (mark === '-' ? onSelect(null) : onSelect('-'))}>
        {neg.label}
      </button>
      {opts.map((c) => {
        const active = list.includes(c.value!)
        return (
          <button key={c.key} type="button" aria-pressed={active} className={'choice' + (active ? ' on' : '')} onClick={() => {
            const next = toggleInList(mark === '+' ? val : '', c.value!)
            if (!next) onSelect(null)
            else onSelect('+', next)
          }}>
            {c.label}
          </button>
        )
      })}
    </div>
  )
}

function DropdownChoices({ choices, mark, val, onSelect }: { choices: Choice[]; mark: Mark | undefined; val: string; onSelect: (mark: Mark | null, value?: string) => void }) {
  let activeKey = ''
  if (mark === '-') activeKey = 'neg'
  else if (mark === '+') activeKey = choices.some((c) => c.value === val) ? val : 'pos'
  return (
    <span className="sel choice-dd">
      <select
        value={activeKey}
        aria-label="finding"
        onChange={(e) => {
          const k = e.target.value
          if (!k) return onSelect(null)
          const c = choices.find((ch) => ch.key === k)
          if (c) onSelect(c.mark, c.value)
        }}
      >
        <option value="">— not addressed —</option>
        {choices.map((c) => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
    </span>
  )
}

function ChipGroup({ options, value, onChange, multi }: { options: ExamOption[]; value: string; onChange: (v: string) => void; multi?: boolean }) {
  const sel = multi ? splitList(value) : [value]
  return (
    <div className="chips">
      {options.map((o) => {
        const on = sel.includes(o.value)
        return (
          <button key={o.value} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} onClick={() => onChange(multi ? toggleInList(value, o.value) : on ? '' : o.value)}>
            <span className="ck">✓</span>
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function SideSeg({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <span className="miniseg" role="radiogroup" aria-label="side">
      {SIDES.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? 'on' : ''} onClick={() => onChange(value === o ? '' : o)}>
          {cap(o)}
        </button>
      ))}
    </span>
  )
}

function Stepper({ value, onChange, ariaLabel }: { value: string; onChange: (v: string) => void; ariaLabel?: string }) {
  const n = parseInt(value, 10)
  const step = (d: number) => onChange(String(Math.max(0, (Number.isFinite(n) ? n : 0) + d)))
  return (
    <span className="stepper">
      <button type="button" aria-label="decrease" onClick={() => step(-1)}>−</button>
      <input inputMode="numeric" value={value} placeholder="—" aria-label={ariaLabel} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))} />
      <button type="button" aria-label="increase" onClick={() => step(1)}>+</button>
    </span>
  )
}

function GcsControl({ get, set }: { get: Getter; set: Setter }) {
  const total = GCS_PARTS.reduce((sum, p) => sum + (parseInt(get(p.sub), 10) || 0), 0)
  return (
    <div className="ex-detail col">
      {GCS_PARTS.map((p) => (
        <div className="gcs-row" key={p.sub}>
          <span className="d-label" style={{ minWidth: 52 }}>{p.label}</span>
          <div className="chips">
            {p.range.map((v) => {
              const on = get(p.sub) === String(v)
              return (
                <button key={v} type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={on} aria-label={`${p.label} ${v}`} onClick={() => set(p.sub, on ? '' : String(v))}>{v}</button>
              )
            })}
          </div>
        </div>
      ))}
      <div className="d-label">Total: <b>{total || '—'}</b></div>
    </div>
  )
}

function TrigeminalControl({ get, set }: { get: Getter; set: Setter }) {
  return (
    <div className="ex-detail col">
      <div>
        <div className="d-label" style={{ marginBottom: 5 }}>Distribution</div>
        <ChipGroup multi options={TRIG_NERVES} value={get('nerves')} onChange={(v) => set('nerves', v)} />
      </div>
      <div>
        <div className="d-label" style={{ marginBottom: 5 }}>Deficit type</div>
        <ChipGroup options={TRIG_TYPES} value={get('type')} onChange={(v) => set('type', v)} />
      </div>
      <SideSeg value={get('side')} onChange={(v) => set('side', v)} />
    </div>
  )
}

/** Small inline note that trails a single marked finding (appended after its clause). */
function ElemNote({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  if (open || value) {
    return <input className="elem-note" value={value} placeholder="note…" aria-label="finding note" onChange={(e) => onChange(e.target.value)} />
  }
  return (
    <button type="button" className="elem-note-btn" title="Add a note to this finding" onClick={() => setOpen(true)}>
      ✎
    </button>
  )
}

function CommentField({ open, value, onOpen, onChange }: { open: boolean; value: string; onOpen: () => void; onChange: (v: string) => void }) {
  if (!open) {
    return <button className="btn-sm comment-btn" onClick={onOpen}>✎ Comment</button>
  }
  return (
    <div className="comment-wrap">
      <label className="np-label" style={{ marginBottom: 6 }}>Comment</label>
      <textarea className="comment-box" value={value} placeholder="Free text — appended to this system's note line" onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

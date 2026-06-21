import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PE_SYSTEMS, ROS_SYSTEMS } from '@/lib/exam/content'
import { assembleText, buildSections } from '@/lib/exam/assemble'
import type { ExamRecord } from '@/lib/exam/types'
import { useExamStore } from '@/state/useExamStore'
import { ExamSystemEditor } from '@/components/ExamSystemEditor'
import { ExamOutput } from '@/components/ExamOutput'

type Modality = 'PE' | 'ROS'

/** Left-list badge: a count once the system has any marks (no subtitle text). */
function badgeFor(rec: ExamRecord | undefined): ReactNode {
  const count = rec ? Object.values(rec.marks).filter((v) => v === '+' || v === '-').length : 0
  if (count) return <span className="pc-count">{count}</span>
  if (rec?.comment.trim()) return <span className="pc-norm">✎</span>
  return null
}

export function ExamBuilder() {
  const [modality, setModality] = useState<Modality>('PE')
  const [activePE, setActivePE] = useState('mf')
  const [activeROS, setActiveROS] = useState('rent')
  const [drawerOpen, setDrawerOpen] = useState(false)

  const pe = useExamStore((s) => s.pe)
  const ros = useExamStore((s) => s.ros)

  const section = modality === 'PE' ? 'pe' : 'ros'
  const active = modality === 'PE' ? activePE : activeROS
  const setActive = modality === 'PE' ? setActivePE : setActiveROS
  const systems = modality === 'PE' ? PE_SYSTEMS : ROS_SYSTEMS
  const recordsForModality = modality === 'PE' ? pe : ros

  const sections = useMemo(() => buildSections(pe, ros), [pe, ros])
  const text = useMemo(() => assembleText(pe, ros), [pe, ros])

  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawerOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  return (
    <div className="workbench">
      {/* Systems list + PE / ROS toggle */}
      <aside className="pane library no-print">
        <div className="lib-head">
          <div className="seg full" role="tablist" aria-label="Exam section">
            <button role="tab" aria-selected={modality === 'PE'} className={modality === 'PE' ? 'on' : ''} onClick={() => setModality('PE')}>
              Physical exam
            </button>
            <button role="tab" aria-selected={modality === 'ROS'} className={modality === 'ROS' ? 'on' : ''} onClick={() => setModality('ROS')}>
              Review of systems
            </button>
          </div>
        </div>
        <div className="lib-group">
          <h4>{modality === 'PE' ? 'Exam by system' : 'Systems'}</h4>
          {systems.map((s) => (
            <button key={s.id} className={'proc-card' + (s.id === active ? ' on' : '')} aria-current={s.id === active} onClick={() => setActive(s.id)}>
              <span className="pc-icon">{s.abbr}</span>
              <span className="pc-body">
                <span className="pc-name">{s.name}</span>
              </span>
              {badgeFor(recordsForModality[s.id])}
            </button>
          ))}
        </div>
      </aside>

      {/* Active system editor */}
      <section className="pane config no-print">
        <div className="config-inner">
          <div className="config-hero">
            <h1>{modality === 'PE' ? 'Physical exam' : 'Review of systems'}</h1>
            <p>
              {modality === 'PE'
                ? 'Mark each element ＋ (abnormal finding) or − (pertinent negative); leave the rest untouched. Only what you mark enters the note. ＋ findings reveal a detail control. “All negative” fills the whole system as pertinent negatives.'
                : 'Mark each symptom ＋ (positive) or − (denied). Only what you mark enters the note. “All negative” marks the whole system denied.'}
            </p>
          </div>

          <ExamSystemEditor key={section + ':' + active} section={section} systemId={active} />
        </div>
      </section>

      {/* Paste-ready output */}
      <section id="exam-output" className={'pane output' + (drawerOpen ? ' open' : '')}>
        <button className="drawer-close no-print" aria-label="Close exam text" onClick={() => setDrawerOpen(false)}>
          ✕
        </button>
        <ExamOutput sections={sections} text={text} />
      </section>

      {drawerOpen && <div className="drawer-backdrop no-print" onClick={() => setDrawerOpen(false)} />}
      <button className="drawer-toggle no-print" aria-controls="exam-output" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
        Exam text
      </button>
    </div>
  )
}

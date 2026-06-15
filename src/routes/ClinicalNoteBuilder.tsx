import { useState } from 'react'
import { SKELETONS, COMPONENTS } from '@/content'
import { Picker } from '@/components/Picker'
import { NoteAssembler } from '@/components/NoteAssembler'

// Skeletons + composable clinical components (exam, A&P, plan, abx, imaging).
const CLINICAL = [...SKELETONS, ...COMPONENTS.filter((c) => c.modes.includes('clinical'))]

export function ClinicalNoteBuilder() {
  const [selected, setSelected] = useState<string>(SKELETONS[0]?.id ?? '')
  const component = CLINICAL.find((c) => c.id === selected)

  return (
    <div className="workbench">
      <aside className="pane library no-print">
        <Picker items={CLINICAL} selected={[selected]} onToggle={setSelected} />
      </aside>
      {component ? (
        <NoteAssembler
          key={component.id}
          components={[component]}
          options={{ includeMissingBlock: true, surfaceFlags: true }}
          resolveIncludes
          filename={`${component.id}.txt`}
          heroTitle="Clinical note"
          heroSub="Consult, H&P, and follow-up skeletons. Dot-phrase includes resolve and a “Missing / to confirm” block is appended."
        />
      ) : (
        <section className="pane config">
          <div className="config-inner">
            <p style={{ color: 'var(--muted)' }}>Select a note type.</p>
          </div>
        </section>
      )}
    </div>
  )
}

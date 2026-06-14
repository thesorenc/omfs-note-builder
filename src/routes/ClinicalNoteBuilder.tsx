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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="no-print">
        <h2 className="mb-3 text-lg font-semibold">Clinical Note Builder</h2>
        <p className="mb-3 text-xs text-slate-500">
          Skeletons resolve dot-phrase includes; a Missing block is appended.
        </p>
        <Picker items={CLINICAL} selected={[selected]} onToggle={setSelected} />
      </aside>
      <section>
        {component ? (
          <>
            <h3 className="no-print mb-4 text-base font-semibold text-slate-800">
              {component.title}
            </h3>
            <NoteAssembler
              key={component.id}
              components={[component]}
              options={{ includeMissingBlock: true, surfaceFlags: true }}
              resolveIncludes
              filename={`${component.id}.txt`}
            />
          </>
        ) : (
          <p className="text-slate-500">Select a note type.</p>
        )}
      </section>
    </div>
  )
}

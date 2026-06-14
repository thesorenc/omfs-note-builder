import { useState } from 'react'
import { OP_TEMPLATES } from '@/content'
import { Picker } from '@/components/Picker'
import { NoteAssembler } from '@/components/NoteAssembler'

export function OpNoteBuilder() {
  const [selected, setSelected] = useState<string>(OP_TEMPLATES[0]?.id ?? '')
  const [withHeader, setWithHeader] = useState(true)
  const component = OP_TEMPLATES.find((c) => c.id === selected)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="no-print">
        <h2 className="mb-3 text-lg font-semibold">Op Note Builder</h2>
        <Picker
          items={OP_TEMPLATES}
          selected={[selected]}
          onToggle={(id) => setSelected(id)}
        />
      </aside>
      <section>
        {component ? (
          <>
            <div className="no-print mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-800">{component.title}</h3>
              <label className="flex items-center gap-1 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={withHeader}
                  onChange={(e) => setWithHeader(e.target.checked)}
                />
                header checklist
              </label>
            </div>
            <NoteAssembler
              key={component.id}
              components={[component]}
              options={{
                includeHeaderChecklist: withHeader,
                includeMissingBlock: true,
                surfaceFlags: true,
              }}
              filename={`${component.id}.txt`}
            />
          </>
        ) : (
          <p className="text-slate-500">Select a procedure.</p>
        )}
      </section>
    </div>
  )
}

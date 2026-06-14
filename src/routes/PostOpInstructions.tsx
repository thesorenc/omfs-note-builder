import { useState } from 'react'
import { COMPONENTS } from '@/content'
import { Picker } from '@/components/Picker'
import { NoteAssembler } from '@/components/NoteAssembler'

const POSTOP = COMPONENTS.filter((c) => c.modes.includes('postop'))

export function PostOpInstructions() {
  const [selected, setSelected] = useState<string[]>([])
  const chosen = POSTOP.filter((c) => selected.includes(c.id))

  function toggle(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="no-print">
        <h2 className="mb-3 text-lg font-semibold">Post-Op Instructions</h2>
        <p className="mb-3 text-xs text-slate-500">
          Select one or more components to assemble a patient handout.
        </p>
        <Picker items={POSTOP} selected={selected} onToggle={toggle} multi />
      </aside>
      <section>
        {chosen.length ? (
          <NoteAssembler
            components={chosen}
            options={{ unfilledPolicy: 'sentinel', surfaceFlags: true }}
            filename="post-op-instructions.txt"
            patientFacing
          />
        ) : (
          <p className="text-slate-500">Select components on the left to build a handout.</p>
        )}
      </section>
    </div>
  )
}

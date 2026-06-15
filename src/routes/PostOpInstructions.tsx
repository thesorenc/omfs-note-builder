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
    <div className="workbench">
      <aside className="pane library no-print">
        <Picker items={POSTOP} selected={selected} onToggle={toggle} multi />
      </aside>
      {chosen.length ? (
        <NoteAssembler
          components={chosen}
          options={{ unfilledPolicy: 'sentinel', surfaceFlags: true }}
          filename="post-op-instructions.txt"
          patientFacing
          heroTitle="Post-op instructions"
          heroSub="Select one or more components on the left to assemble a printable patient handout."
        />
      ) : (
        <section className="pane config">
          <div className="config-inner">
            <div className="case-empty">
              <div className="ce-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M9 13h6M9 17h6" />
                </svg>
              </div>
              <h3>No components selected</h3>
              <p>Pick post-op instruction components from the library to build a handout.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

import { useState } from 'react'
import { OP_TEMPLATES } from '@/content'
import { Picker } from '@/components/Picker'
import { NoteAssembler } from '@/components/NoteAssembler'
import { EncounterBar } from '@/components/EncounterBar'
import { defaultEncounter, encounterHeader, type Encounter } from '@/lib/encounter'

export function OpNoteBuilder() {
  const [selected, setSelected] = useState<string>(OP_TEMPLATES[0]?.id ?? '')
  const [enc, setEnc] = useState<Encounter>(defaultEncounter)
  const component = OP_TEMPLATES.find((c) => c.id === selected)

  return (
    <div className="workbench">
      <aside className="pane library no-print">
        <Picker items={OP_TEMPLATES} selected={[selected]} onToggle={setSelected} />
      </aside>
      {component ? (
        <NoteAssembler
          key={component.id}
          components={[component]}
          options={{ includeMissingBlock: true, surfaceFlags: true }}
          filename={`${component.id}.txt`}
          heroTitle="Operative note"
          heroSub="Pick a procedure, fill the encounter and variables, and the note updates live. Identifiers stay as EHR placeholders."
          encounter={<EncounterBar value={enc} onChange={setEnc} />}
          prependText={encounterHeader(enc)}
        />
      ) : (
        <section className="pane config">
          <div className="config-inner">
            <p style={{ color: 'var(--muted)' }}>Select a procedure.</p>
          </div>
        </section>
      )}
    </div>
  )
}

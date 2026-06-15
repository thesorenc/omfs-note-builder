import { ATTENDINGS, ANESTHESIA, SETTINGS, type Encounter } from '@/lib/encounter'

export function EncounterBar({
  value,
  onChange,
}: {
  value: Encounter
  onChange: (e: Encounter) => void
}) {
  const set = (patch: Partial<Encounter>) => onChange({ ...value, ...patch })
  const setResident = (i: number, v: string) =>
    set({ residents: value.residents.map((r, idx) => (idx === i ? v : r)) })

  return (
    <div className="encounter-bar">
      <div className="enc-field">
        <label>Attending</label>
        <div className="sel" style={{ minWidth: 160 }}>
          <select value={value.attending} onChange={(e) => set({ attending: e.target.value })}>
            <option value="">— select —</option>
            {ATTENDINGS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field">
        <label>Resident(s)</label>
        <div className="resident-list">
          {value.residents.map((r, i) => (
            <div className="resident-row" key={i}>
              <input value={r} placeholder="Dr. —" onChange={(e) => setResident(i, e.target.value)} />
              {value.residents.length > 1 && (
                <button
                  className="res-x"
                  title="Remove"
                  onClick={() => set({ residents: value.residents.filter((_, idx) => idx !== i) })}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button className="res-add" onClick={() => set({ residents: [...value.residents, ''] })}>
            + Add resident
          </button>
        </div>
      </div>

      <div className="enc-field">
        <label>Date</label>
        <input type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
      </div>

      <div className="enc-field">
        <label>Anesthesia</label>
        <div className="sel" style={{ minWidth: 170 }}>
          <select value={value.anesthesia} onChange={(e) => set({ anesthesia: e.target.value })}>
            {ANESTHESIA.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field">
        <label>Setting</label>
        <div className="sel" style={{ minWidth: 100 }}>
          <select value={value.setting} onChange={(e) => set({ setting: e.target.value })}>
            {SETTINGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field" style={{ flex: 1, minWidth: 160 }}>
        <label>Complications</label>
        <input
          value={value.complications}
          onChange={(e) => set({ complications: e.target.value })}
        />
      </div>
    </div>
  )
}

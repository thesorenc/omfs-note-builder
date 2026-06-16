import {
  ATTENDINGS,
  ANESTHESIA,
  AIRWAY,
  SETTINGS,
  DISPOSITIONS,
  type Encounter,
} from '@/lib/encounter'

const OTHER = '__other__'

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

  const attendingIsOther = value.attending !== '' && !ATTENDINGS.includes(value.attending)

  return (
    <div className="encounter-bar">
      <div className="enc-field">
        <label htmlFor="enc-attending">Attending</label>
        <div className="sel" style={{ minWidth: 160 }}>
          <select
            id="enc-attending"
            value={attendingIsOther ? OTHER : value.attending}
            onChange={(e) => set({ attending: e.target.value === OTHER ? ' ' : e.target.value })}
          >
            <option value="">— select —</option>
            {ATTENDINGS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
        </div>
        {attendingIsOther && (
          <input
            style={{ marginTop: 4 }}
            aria-label="Attending name"
            placeholder="Dr. —"
            value={value.attending.trim()}
            onChange={(e) => set({ attending: e.target.value })}
          />
        )}
      </div>

      <div className="enc-field">
        <label id="enc-residents-lbl">Resident(s)</label>
        <div className="resident-list" role="group" aria-labelledby="enc-residents-lbl">
          {value.residents.map((r, i) => (
            <div className="resident-row" key={i}>
              <input
                value={r}
                aria-label={`Resident ${i + 1}`}
                placeholder="Dr. —"
                onChange={(e) => setResident(i, e.target.value)}
              />
              {value.residents.length > 1 && (
                <button
                  className="res-x"
                  aria-label={`Remove resident ${i + 1}`}
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
        <label htmlFor="enc-date">Date</label>
        <input id="enc-date" type="date" value={value.date} onChange={(e) => set({ date: e.target.value })} />
      </div>

      <div className="enc-field">
        <label htmlFor="enc-anesthesia">Anesthesia</label>
        <div className="sel" style={{ minWidth: 170 }}>
          <select id="enc-anesthesia" value={value.anesthesia} onChange={(e) => set({ anesthesia: e.target.value })}>
            <option value="">— select —</option>
            {ANESTHESIA.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field">
        <label htmlFor="enc-airway">Airway</label>
        <div className="sel" style={{ minWidth: 140 }}>
          <select id="enc-airway" value={value.airway} onChange={(e) => set({ airway: e.target.value })}>
            {AIRWAY.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field">
        <label htmlFor="enc-setting">Setting</label>
        <div className="sel" style={{ minWidth: 100 }}>
          <select id="enc-setting" value={value.setting} onChange={(e) => set({ setting: e.target.value })}>
            <option value="">— select —</option>
            {SETTINGS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field">
        <label htmlFor="enc-ebl">EBL</label>
        <input id="enc-ebl" style={{ width: 90 }} value={value.ebl} onChange={(e) => set({ ebl: e.target.value })} />
      </div>

      <div className="enc-field">
        <label htmlFor="enc-disp">Disposition</label>
        <div className="sel" style={{ minWidth: 150 }}>
          <select id="enc-disp" value={value.disposition} onChange={(e) => set({ disposition: e.target.value })}>
            <option value="">— select —</option>
            {DISPOSITIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="enc-field" style={{ flex: 1, minWidth: 160 }}>
        <label htmlFor="enc-comp">Complications</label>
        <input id="enc-comp" value={value.complications} onChange={(e) => set({ complications: e.target.value })} />
      </div>
    </div>
  )
}

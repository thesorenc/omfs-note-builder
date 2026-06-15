export interface Encounter {
  attending: string
  residents: string[]
  date: string
  anesthesia: string
  airway: string
  setting: string
  ebl: string
  disposition: string
  complications: string
}

// Placeholder roster — replace with the real Walter Reed OMFS staff. "Other…" lets
// the user type a name inline meanwhile.
export const ATTENDINGS = ['Dr. Whitman', 'Dr. Patel', 'Dr. Nguyen', 'Dr. Okafor']
export const ANESTHESIA = ['Local only', 'Local + nitrous', 'IV moderate sedation', 'General anesthesia']
export const AIRWAY = ['N/A', 'Nasal ETT', 'Oral ETT', 'LMA', 'Awake fiberoptic', 'Tracheostomy']
export const SETTINGS = ['Clinic', 'OR']
export const DISPOSITIONS = ['Home', 'PACU then home', 'Inpatient floor', 'ICU']

export function defaultEncounter(): Encounter {
  return {
    attending: '',
    residents: [''],
    date: new Date().toISOString().slice(0, 10),
    anesthesia: 'Local only',
    airway: 'N/A',
    setting: 'Clinic',
    ebl: 'Minimal',
    disposition: 'Home',
    complications: 'None',
  }
}

/** Build the EMR header block prepended to the op note (filled fields only). */
export function encounterHeader(e: Encounter): string {
  const lines: string[] = []
  const fmtDate = e.date
    ? new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  if (e.attending) lines.push(`Attending: ${e.attending}`)
  const res = e.residents.map((r) => r.trim()).filter(Boolean)
  if (res.length) lines.push(`Resident(s): ${res.join(', ')}`)
  if (fmtDate) lines.push(`Date of service: ${fmtDate}`)
  if (e.setting) lines.push(`Setting: ${e.setting}`)
  if (e.anesthesia) lines.push(`Anesthesia: ${e.anesthesia}`)
  if (e.airway && e.airway !== 'N/A') lines.push(`Airway: ${e.airway}`)
  if (e.ebl) lines.push(`EBL: ${e.ebl}`)
  if (e.disposition) lines.push(`Disposition: ${e.disposition}`)
  if (e.complications) lines.push(`Complications: ${e.complications}`)
  return lines.join('\n')
}

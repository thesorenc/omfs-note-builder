export interface Encounter {
  attending: string
  residents: string[]
  date: string
  anesthesia: string
  setting: string
  complications: string
}

export const ATTENDINGS = ['Dr. Whitman', 'Dr. Patel', 'Dr. Nguyen', 'Dr. Okafor']
export const ANESTHESIA = ['Local only', 'Local + nitrous', 'IV moderate sedation', 'General anesthesia']
export const SETTINGS = ['Clinic', 'OR']

export function defaultEncounter(): Encounter {
  return {
    attending: '',
    residents: [''],
    date: new Date().toISOString().slice(0, 10),
    anesthesia: 'Local only',
    setting: 'Clinic',
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
  if (e.complications) lines.push(`Complications: ${e.complications}`)
  return lines.join('\n')
}

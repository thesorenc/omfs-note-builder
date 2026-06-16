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

// Walter Reed OMFS attending staff. "Other…" lets the user type a name inline.
export const ATTENDINGS = [
  'Dr. Bensing',
  'Dr. Betz',
  'Dr. Combs',
  'Dr. Dullnig',
  'Dr. Fisher',
  'Dr. Lee',
  'Dr. Palau',
  'Dr. Park',
]
export const ANESTHESIA = ['Local only', 'Local + nitrous', 'IV moderate sedation', 'General anesthesia']
export const AIRWAY = ['N/A', 'Nasal ETT', 'Oral ETT', 'LMA', 'Awake fiberoptic', 'Tracheostomy']
export const SETTINGS = ['Clinic', 'OR']
export const DISPOSITIONS = ['Home', 'PACU then home', 'Inpatient floor', 'ICU']

export function defaultEncounter(): Encounter {
  return {
    attending: '',
    residents: [''],
    date: new Date().toISOString().slice(0, 10),
    // Setting/anesthesia/disposition default BLANK: an unset field is suppressed from
    // the header rather than asserting a (possibly wrong) "Clinic / Local only / Home"
    // above an OR/GA operative body. The surgeon chooses them per case.
    anesthesia: '',
    airway: 'N/A',
    setting: '',
    ebl: 'Minimal',
    disposition: '',
    complications: 'None',
  }
}

/**
 * Standard operative-note header. Auto-fills the procedure list from the case and the
 * encounter fields the surgeon has set; leaves the medicolegal fields the app cannot
 * know (diagnoses, specimens, hardware log, CPT/time) as labeled blanks to complete.
 * Encounter lines that are unset are omitted (no misleading defaults).
 */
export function operativeHeader(e: Encounter, procedureNames: string[]): string {
  const fmtDate = e.date
    ? new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : ''
  const res = e.residents.map((r) => r.trim()).filter(Boolean)
  const procList = procedureNames.length
    ? procedureNames.map((n, i) => `  ${i + 1}. ${n}`).join('\n')
    : '  '

  const lines: string[] = [
    'PREOPERATIVE DIAGNOSIS:',
    'POSTOPERATIVE DIAGNOSIS:',
    'PROCEDURE(S) PERFORMED:',
    procList,
  ]
  if (e.attending) lines.push(`ATTENDING SURGEON: ${e.attending}`)
  if (res.length) lines.push(`RESIDENT(S)/ASSISTANT(S): ${res.join(', ')}`)
  if (fmtDate) lines.push(`DATE OF SERVICE: ${fmtDate}`)
  if (e.setting) lines.push(`SETTING: ${e.setting}`)
  if (e.anesthesia) lines.push(`ANESTHESIA: ${e.anesthesia}`)
  if (e.airway && e.airway !== 'N/A') lines.push(`AIRWAY: ${e.airway}`)
  lines.push('SPECIMENS (with destination):')
  lines.push('IMPLANTS/HARDWARE (manufacturer, size, lot):')
  if (e.ebl) lines.push(`ESTIMATED BLOOD LOSS: ${e.ebl}`)
  if (e.disposition) lines.push(`DISPOSITION: ${e.disposition}`)
  if (e.complications) lines.push(`COMPLICATIONS: ${e.complications}`)
  lines.push('CPT / TOTAL OPERATIVE TIME:')
  return lines.join('\n')
}

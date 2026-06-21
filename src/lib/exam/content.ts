// OMFS-tailored exam content as a typed repo config. Every system is a list of elements;
// the editor renders each element's CHOICES as inline buttons (or a dropdown when many) —
// the first choice is the pertinent negative ("Absent" / `normalLabel`). Under the hood an
// element resolves to a +/− mark plus a `detail` value, which the assembler turns into note
// text. '+' may carry a free-text `detail` (side/mm/text/tooth) OR a richer `control`
// (select / multiselect / measure / teeth / gcs / trigeminal); multi-value controls encode
// into the flat detail map via `${id}.${subkey}` keys.
//
// Editing: tune freely. `neg` defaults to `no <label>`; set it for idiomatic negatives
// (EOMI, PERRL, RRR, supple). `normalLabel` names the negative button for non-"Absent" cases.

import type { ExamSystem } from './types'

const teeth = (v: string) => (v ? v.split(/,\s*/).filter(Boolean).map((t) => `#${t}`).join(', ') : '#__')

export const PE_SYSTEMS: ExamSystem[] = [
  {
    id: 'gen', name: 'General', abbr: 'GEN', elements: [
      { id: 'distress', label: 'Acute distress', control: 'select', normalLabel: 'None', options: [{ value: 'mild', label: 'Mild' }, { value: 'moderate', label: 'Moderate' }, { value: 'severe', label: 'Severe' }], build: (g) => `in ${g() || 'acute'} distress`, neg: 'no acute distress' },
      { id: 'appearance', label: 'General appearance', pos: () => 'ill-appearing', neg: 'well-appearing, well-nourished' },
      { id: 'febrile', label: 'Febrile', pos: () => 'febrile', neg: 'afebrile' },
    ],
  },
  {
    id: 'mf', name: 'Head', abbr: 'HD', elements: [
      { id: 'swell', label: 'Facial swelling', detail: 'side', pos: (s) => `${s} facial swelling`, neg: 'no facial swelling' },
      { id: 'ecchy', label: 'Ecchymosis', detail: 'side', pos: (s) => `${s} facial ecchymosis`, neg: 'no ecchymosis' },
      { id: 'step', label: 'Bony step-off', detail: 'text', hint: 'e.g. infraorbital rim', pos: (v) => `palpable step-off${v ? ` at the ${v}` : ''}`, neg: 'no bony step-offs; midface and mandible stable' },
      { id: 'crep', label: 'Crepitus', neg: 'no crepitus' },
      { id: 'tender', label: 'Tenderness', detail: 'text', hint: 'e.g. left mandibular body', pos: (v) => `tenderness${v ? ` over the ${v}` : ''}`, neg: 'non-tender to palpation' },
      { id: 'lac', label: 'Laceration', detail: 'text', hint: 'site / length', pos: (v) => `laceration${v ? ` (${v})` : ''}`, neg: 'overlying skin intact' },
      { id: 'asym', label: 'Facial asymmetry', pos: () => 'facial asymmetry', neg: 'face symmetric' },
    ],
  },
  {
    id: 'eyes', name: 'Eyes', abbr: 'EYE', elements: [
      { id: 'eom', label: 'Extraocular movements', detail: 'side', pos: (s) => `restricted extraocular motion, ${s}`, neg: 'EOMI' },
      { id: 'pupils', label: 'Pupils', detail: 'text', hint: 'anisocoria / sluggish', pos: (v) => v || 'pupillary abnormality', neg: 'PERRL' },
      { id: 'va', label: 'Visual acuity', pos: () => 'decreased visual acuity', neg: 'visual acuity grossly intact' },
      { id: 'dipl', label: 'Diplopia', detail: 'text', hint: 'gaze', pos: (v) => `diplopia${v ? ` on ${v} gaze` : ''}`, neg: 'no diplopia' },
      { id: 'globe', label: 'Globe position', control: 'select', normalLabel: 'Normal', side: true, options: [{ value: 'enophthalmos', label: 'Enophthalmos' }, { value: 'proptosis', label: 'Proptosis' }, { value: 'hypoglobus', label: 'Hypoglobus' }], build: (g) => `${g('side') ? `${g('side')} ` : ''}${g() || 'globe malposition'}`, neg: 'no enophthalmos or proptosis' },
      { id: 'sclera', label: 'Sclera / conjunctiva', detail: 'side', pos: (s) => `${s} subconjunctival hemorrhage`, neg: 'sclera and conjunctiva clear' },
      { id: 'peri', label: 'Periorbital edema', detail: 'side', pos: (s) => `${s} periorbital edema`, neg: 'no periorbital edema' },
    ],
  },
  {
    id: 'ears', name: 'Ears', abbr: 'EAR', elements: [
      { id: 'hemo', label: 'Hemotympanum', detail: 'side', pos: (s) => `${s} hemotympanum`, neg: 'no hemotympanum' },
      { id: 'battle', label: "Battle's sign", detail: 'side', pos: (s) => `${s} Battle's sign`, neg: "no Battle's sign" },
    ],
  },
  {
    id: 'nose', name: 'Nose', abbr: 'NOS', elements: [
      { id: 'epi', label: 'Epistaxis', detail: 'side', pos: (s) => `${s} epistaxis`, neg: 'no epistaxis' },
      { id: 'septh', label: 'Septal hematoma', neg: 'no septal hematoma; septum midline' },
      { id: 'csf', label: 'CSF rhinorrhea', neg: 'no rhinorrhea' },
      { id: 'nasdef', label: 'Nasal deformity', neg: 'no nasal deformity; nares patent' },
    ],
  },
  {
    id: 'io', name: 'Mouth', abbr: 'MO', elements: [
      { id: 'mucosa', label: 'Mucosa', detail: 'text', hint: 'erythema / ulceration', pos: (v) => (v ? `mucosal ${v}` : 'mucosal abnormality'), neg: 'mucosa moist and pink' },
      { id: 'vest', label: 'Vestibular swelling', detail: 'text', hint: 'e.g. left mandibular buccal', pos: (v) => `swelling of the ${v || 'buccal'} vestibule`, neg: 'no vestibular swelling' },
      { id: 'fom', label: 'Floor of mouth', pos: () => 'floor-of-mouth elevation', neg: 'floor of mouth soft and non-tender' },
      { id: 'dentition', label: 'Dentition', detail: 'text', hint: 'caries / edentulous', pos: (v) => v || 'dental disease', neg: 'dentition intact' },
      { id: 'occ', label: 'Occlusion', control: 'select', normalLabel: 'Stable', options: [{ value: 'mal', label: 'Malocclusion' }], build: () => 'malocclusion', neg: 'occlusion stable and reproducible' },
      { id: 'fx', label: 'Tooth fracture', control: 'teeth', normalLabel: 'None', build: (g) => `fracture of ${teeth(g())}`, neg: 'no tooth fractures' },
      { id: 'mob', label: 'Mobile dentition', control: 'teeth', normalLabel: 'None', build: (g) => `mobility of ${teeth(g())}`, neg: 'no mobile dentition' },
      { id: 'lesion', label: 'Mucosal lesion', detail: 'text', hint: 'site / size', pos: (v) => `mucosal lesion${v ? ` (${v})` : ''}`, neg: 'no mucosal lesions' },
      { id: 'pus', label: 'Purulent drainage', neg: 'no purulent drainage' },
      { id: 'bone', label: 'Exposed bone', detail: 'text', hint: 'site', pos: (v) => `exposed bone${v ? ` at the ${v}` : ''}`, neg: 'no exposed bone' },
      { id: 'salflow', label: 'Salivary flow', detail: 'text', hint: 'duct / character', pos: (v) => v || 'abnormal salivary flow', neg: 'clear salivary flow from Stensen’s and Wharton’s ducts' },
    ],
  },
  {
    id: 'tmj', name: 'TMJ', abbr: 'TMJ', elements: [
      { id: 'mio', label: 'Mouth opening (MIO)', control: 'measure', normalLabel: 'Full ROM', unit: 'mm', abnormalBelow: 35, build: (g) => { const n = parseInt(g(), 10); return `${Number.isFinite(n) && n < 35 ? 'limited opening, ' : ''}MIO ${g() || '__'} mm` }, neg: 'full range of motion' },
      { id: 'tend', label: 'Pre-auricular tenderness', detail: 'side', pos: (s) => `${s} pre-auricular tenderness`, neg: 'TMJ non-tender' },
      { id: 'click', label: 'Clicking / popping', detail: 'side', pos: (s) => `${s} clicking`, neg: 'no clicking or popping' },
      { id: 'crep', label: 'Crepitus', detail: 'side', pos: (s) => `${s} crepitus`, neg: 'no crepitus' },
      { id: 'dev', label: 'Deviation on opening', detail: 'side', pos: (s) => `deviation on opening toward the ${s}`, neg: 'no deviation on opening' },
      { id: 'lock', label: 'Locking', detail: 'text', hint: 'open / closed', pos: (v) => `locking${v ? ` (${v})` : ''}`, neg: 'no locking' },
    ],
  },
  {
    id: 'neck', name: 'Neck', abbr: 'NK', elements: [
      { id: 'lad', label: 'Lymphadenopathy', control: 'multiselect', normalLabel: 'None', side: true, size: true, options: [{ value: 'I', label: 'I' }, { value: 'II', label: 'II' }, { value: 'III', label: 'III' }, { value: 'IV', label: 'IV' }, { value: 'V', label: 'V' }, { value: 'VI', label: 'VI' }], build: (g) => `${g('size') ? `${g('size')} cm ` : ''}${g('side') ? `${g('side')} ` : ''}level ${g() || '__'} lymphadenopathy`, neg: 'no lymphadenopathy' },
      { id: 'mass', label: 'Neck mass', detail: 'text', hint: 'location', pos: (v) => `neck mass${v ? ` (${v})` : ''}`, neg: 'no masses' },
      { id: 'tender', label: 'Tenderness', detail: 'text', hint: 'location', pos: (v) => `tenderness${v ? ` (${v})` : ''}`, neg: 'non-tender' },
      { id: 'rom', label: 'Range of motion', pos: () => 'limited range of motion', neg: 'supple, full range of motion' },
      { id: 'thyroid', label: 'Thyroid', pos: () => 'thyromegaly', neg: 'no thyromegaly' },
      { id: 'trachea', label: 'Trachea', pos: () => 'tracheal deviation', neg: 'trachea midline' },
      { id: 'salgland', label: 'Salivary glands', detail: 'text', hint: 'gland / side / finding', pos: (v) => v || 'glandular swelling', neg: 'parotid and submandibular glands non-tender' },
    ],
  },
  {
    id: 'cv', name: 'Cardiovascular', abbr: 'CV', elements: [
      { id: 'rhythm', label: 'Rate / rhythm', pos: () => 'irregular rhythm', neg: 'regular rate and rhythm' },
      { id: 'mur', label: 'Murmur', detail: 'text', hint: 'grade / location', pos: (v) => `murmur${v ? ` (${v})` : ''}`, neg: 'no murmurs, rubs, or gallops' },
      { id: 'edema', label: 'Peripheral edema', pos: () => 'peripheral edema', neg: 'no peripheral edema' },
      { id: 'pulses', label: 'Pulses', pos: () => 'diminished pulses', neg: 'pulses 2+ and symmetric' },
    ],
  },
  {
    id: 'resp', name: 'Respiratory', abbr: 'RES', elements: [
      { id: 'ausc', label: 'Auscultation', detail: 'text', hint: 'wheezes / crackles', pos: (v) => v || 'abnormal breath sounds', neg: 'clear to auscultation bilaterally' },
      { id: 'distress', label: 'Respiratory distress', pos: () => 'respiratory distress', neg: 'no respiratory distress' },
      { id: 'stridor', label: 'Stridor', neg: 'no stridor' },
      { id: 'airway', label: 'Airway', control: 'select', normalLabel: 'Patent', options: [{ value: 'at risk', label: 'At risk' }, { value: 'compromised', label: 'Compromised' }], build: (g) => `airway ${g() || 'compromised'}`, neg: 'airway patent' },
    ],
  },
  {
    id: 'neuro', name: 'Neuro', abbr: 'NEU', elements: [
      { id: 'orient', label: 'Orientation', detail: 'text', hint: 'to ___', pos: (v) => `disoriented${v ? ` ${v}` : ''}`, neg: 'alert and oriented ×3' },
      { id: 'gcs', label: 'GCS', control: 'gcs', normalLabel: 'GCS 15', build: (g) => { const e = g('e'), v = g('v'), m = g('m'); const tot = (parseInt(e, 10) || 0) + (parseInt(v, 10) || 0) + (parseInt(m, 10) || 0); return tot ? `GCS ${tot} (E${e || '_'} V${v || '_'} M${m || '_'})` : 'GCS' }, neg: 'GCS 15' },
      { id: 'focal', label: 'Focal deficit', detail: 'text', hint: 'describe', pos: (v) => `focal deficit${v ? ` (${v})` : ''}`, neg: 'no focal neurologic deficit' },
      { id: 'sens', label: 'Trigeminal sensation', control: 'trigeminal', normalLabel: 'Intact', build: (g) => `${g('side') ? `${g('side')} ` : ''}${g('nerves') || 'trigeminal'} ${g('type') || 'paresthesia'}`, neg: 'facial sensation intact in V1–V3' },
      { id: 'facial', label: 'Facial nerve (VII)', control: 'select', normalLabel: 'Normal (HB I)', side: true, options: [{ value: 'II', label: 'HB II' }, { value: 'III', label: 'HB III' }, { value: 'IV', label: 'HB IV' }, { value: 'V', label: 'HB V' }, { value: 'VI', label: 'HB VI' }], build: (g) => `${g('side') ? `${g('side')} ` : ''}House-Brackmann ${g() || '__'} facial weakness`, neg: 'facial nerve symmetric, House-Brackmann I' },
      { id: 'cn12', label: 'Tongue (CN XII)', detail: 'side', pos: (s) => `tongue deviation to the ${s}`, neg: 'tongue midline' },
      { id: 'other', label: 'CN II–XII', detail: 'text', pos: (v) => `${v || 'cranial nerve'} deficit`, neg: 'CN II–XII otherwise grossly intact' },
    ],
  },
]

export const ROS_SYSTEMS: ExamSystem[] = [
  { id: 'rgen', name: 'Constitutional', abbr: 'GEN', elements: [
    { id: 'fever', label: 'Fever' }, { id: 'chills', label: 'Chills' }, { id: 'wl', label: 'Weight loss' }, { id: 'fatigue', label: 'Fatigue' }, { id: 'sweats', label: 'Night sweats' },
  ] },
  { id: 'reyes', name: 'Eyes', abbr: 'EYE', elements: [
    { id: 'vis', label: 'Vision changes' }, { id: 'dip', label: 'Diplopia' }, { id: 'pain', label: 'Eye pain' },
  ] },
  { id: 'rent', name: 'ENT / Mouth', abbr: 'ENT', elements: [
    { id: 'facpain', label: 'Facial pain' }, { id: 'facswell', label: 'Facial swelling' }, { id: 'chew', label: 'Difficulty chewing' }, { id: 'swallow', label: 'Difficulty swallowing' },
    { id: 'tris', label: 'Trismus' }, { id: 'biteoff', label: 'Bite feels off' }, { id: 'bleed', label: 'Oral bleeding' }, { id: 'hearing', label: 'Hearing loss' }, { id: 'throat', label: 'Sore throat' },
  ] },
  { id: 'rcv', name: 'Cardiovascular', abbr: 'CV', elements: [
    { id: 'cp', label: 'Chest pain' }, { id: 'palp', label: 'Palpitations' }, { id: 'edema', label: 'Leg edema' },
  ] },
  { id: 'rresp', name: 'Respiratory', abbr: 'RES', elements: [
    { id: 'sob', label: 'Shortness of breath' }, { id: 'cough', label: 'Cough' }, { id: 'wheeze', label: 'Wheezing' },
  ] },
  { id: 'rgi', name: 'Gastrointestinal', abbr: 'GI', elements: [
    { id: 'nv', label: 'Nausea / vomiting' }, { id: 'abd', label: 'Abdominal pain' }, { id: 'dysph', label: 'Dysphagia' },
  ] },
  { id: 'rgu', name: 'Genitourinary', abbr: 'GU', elements: [
    { id: 'dys', label: 'Dysuria' }, { id: 'freq', label: 'Frequency' }, { id: 'hematuria', label: 'Hematuria' },
  ] },
  { id: 'rmsk', name: 'Musculoskeletal', abbr: 'MSK', elements: [
    { id: 'joint', label: 'Joint pain' }, { id: 'myal', label: 'Myalgias' }, { id: 'back', label: 'Back pain' },
  ] },
  { id: 'rskin', name: 'Integumentary', abbr: 'SK', elements: [
    { id: 'rash', label: 'Rash' }, { id: 'lesion', label: 'Lesions' }, { id: 'itch', label: 'Pruritus' },
  ] },
  { id: 'rneuro', name: 'Neurologic', abbr: 'NEU', elements: [
    { id: 'ha', label: 'Headache' }, { id: 'numb', label: 'Facial numbness / paresthesia' }, { id: 'weak', label: 'Weakness' }, { id: 'dizzy', label: 'Dizziness' },
  ] },
  { id: 'rpsych', name: 'Psychiatric', abbr: 'PSY', elements: [
    { id: 'dep', label: 'Depression' }, { id: 'anx', label: 'Anxiety' },
  ] },
  { id: 'rendo', name: 'Endocrine', abbr: 'END', elements: [
    { id: 'poly', label: 'Polyuria / polydipsia' }, { id: 'temp', label: 'Heat / cold intolerance' },
  ] },
  { id: 'rheme', name: 'Heme / Lymphatic', abbr: 'HEM', elements: [
    { id: 'bruise', label: 'Easy bruising / bleeding' }, { id: 'lad', label: 'Lymphadenopathy' },
  ] },
  { id: 'rallergy', name: 'Allergic / Immuno', abbr: 'ALL', elements: [
    { id: 'allergies', label: 'Seasonal allergies' }, { id: 'hives', label: 'Hives' },
  ] },
]

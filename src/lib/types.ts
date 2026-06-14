// Core type model shared by the tokenizer, assembler, build pipeline, and UI.

// Private-use delimiters for field sentinels in bodyTemplate. Chosen so that
// literal "{{...}}" appearing in source template text can never collide.
export const SENTINEL_OPEN = '\uE000'
export const SENTINEL_CLOSE = '\uE001'

export type FieldKind =
  | 'side' // [R/L], [right/left] -> enum toggle, rendered per token spelling
  | 'toothNumber' // [#__] -> text (32, 8/9, lists)
  | 'measurement' // [X], [X] mm, [length] mm, [length]-mm, [X] cc, [X] Ncm
  | 'hardwareCount' // [#]-hole, [#] screws -> integer
  | 'hardwareDim' // [diameter]x[length] -> compound (two number subfields)
  | 'enumText' // ___ (a / b / c) -> select with options + Other
  | 'blank' // ___ or _ with no parseable hint -> free text
  | 'text' // [profile], [size], [Attending] -> free text
  | 'smartlink' // [Age], [Allergies], [pfs_*] -> NON-fillable, emitted verbatim
  | 'flag' // [CONFIRM...], [TEMPLATE NOTE...], [TITLE CHECK...] -> warning, not a field
  | 'include' // .sacxexam, .sacsign -> resolves to another component

export type MeasurementUnit = 'mm' | 'cc' | 'Ncm' | 'degrees' | null

export interface Field {
  /** Stable id: `${componentId}:${kind}:${index}`. */
  id: string
  kind: FieldKind
  /** Exact source text matched, e.g. "[length]-mm". */
  raw: string
  /** Human label derived from surrounding context. */
  label: string
  unit?: MeasurementUnit
  /** For side / enumText. */
  options?: string[]
  /** For hardwareDim (diameter, length). */
  subFields?: Field[]
  /** Fields sharing a linkKey are driven by one control (side only, by default). */
  linkKey?: string
  defaultValue?: string
  /** For enumText/blank: the original hint text shown as placeholder. */
  hint?: string
}

export interface FlagAnnotation {
  /** CONFIRM | TEMPLATE NOTE | TITLE CHECK */
  type: string
  /** Full text of the bracketed block, brackets stripped. */
  text: string
}

export type ComponentMode = 'postop' | 'opnote' | 'clinical' | 'library'

export interface ParsedComponent {
  /** Slug of filename, e.g. 'post-op-instructions-orif'. */
  id: string
  /** '.sacxpiorif' when known (frontmatter or catalog). */
  dotPhrase?: string
  /** Display title. */
  title: string
  category: string
  /** Which feature modes can use this component. */
  modes: ComponentMode[]
  /** Absolute vault path (traceability + library export). */
  sourcePath: string
  /** Cleaned body with each token replaced by a {{fieldId}} sentinel. */
  bodyTemplate: string
  fields: Field[]
  flags: FlagAnnotation[]
  /** Referenced component dot-phrases / ids (.sacx*). */
  includes: string[]
  tags: string[]
  /** Original body text (for the edit -> download-md feature). */
  rawBody: string
  /** Non-fatal parse warnings (unrecognized tokens, etc.). */
  warnings: string[]
}

/** Result of parsing a raw markdown body (no frontmatter). */
export interface TokenizeResult {
  bodyTemplate: string
  fields: Field[]
  flags: FlagAnnotation[]
  includes: string[]
  warnings: string[]
}

// Ordered placeholder tokenizer. Pure function, shared by the build pipeline,
// the app, and the test suite. Turns a raw markdown body into a bodyTemplate
// (tokens replaced by {{fieldId}} sentinels) plus typed Field/Flag/include lists.
//
// Strategy:
//  1. Find all top-level balanced [...] spans. Balanced matching means a
//     [CONFIRM ... contains [#__] ...] block is ONE span, so fillable parsing
//     never reaches inside it.
//  2. Classify each bracket span (flag / smartlink / side / tooth / measurement /
//     hardware / text / annotation), merging [diameter]x[length] compounds.
//  3. In the regions NOT claimed by brackets, find .sac* includes and ___ / _ blanks.
//  4. Assign stable ids, derive labels, and rebuild the bodyTemplate.

import type { Field, FlagAnnotation, MeasurementUnit, TokenizeResult } from './types'
import { SENTINEL_OPEN as S0, SENTINEL_CLOSE as S1 } from './types'

interface RawToken {
  start: number
  end: number
  kind: Field['kind']
  raw: string
  unit?: MeasurementUnit
  options?: string[]
  hint?: string
  /** for flags */
  flagType?: string
  /** remove this flag's text from the assembled body (only reviewer annotations) */
  strip?: boolean
  /** surface this flag in the flags list / banner */
  surface?: boolean
  /** for includes */
  dotPhrase?: string
}

interface BracketSpan {
  start: number
  end: number
  content: string // inner text, untrimmed
}

// Stems that take trailing arguments, matched as "<stem> ..." (startsWith + space).
// Bare patient identifiers (name/mrn/dob/provider) are deliberately EXACT-only: a
// startsWith on them mis-claims "[Provider Name]" / "[Name Of Procedure]" as
// non-fillable smartlinks (see isSmartlink).
const SMARTLINK_PREFIXES = [
  'age',
  'allergies',
  'problems',
  'home medications',
  'medications given',
  'patient gender',
  'vital signs',
  'procedure history',
  'st height',
  'st weight',
  'st lab',
  'st rad',
  'date of birth',
]
const SMARTLINK_EXACT = new Set([...SMARTLINK_PREFIXES, 'name', 'mrn', 'dob', 'provider'])

// Find ALL bracket spans, then keep only the top-level ones. Unmatched '[' and ']'
// are treated as literals (and warned) rather than swallowing every later placeholder:
// a single stray '[' must not become a black hole that silently drops the rest of the
// template. Legitimate nesting ([CONFIRM ... [#__] ...]) still yields one outer span.
function findTopLevelBrackets(s: string, warnings: string[]): BracketSpan[] {
  const openStack: number[] = []
  const pairs: Array<{ start: number; end: number }> = []
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '[') openStack.push(i)
    else if (ch === ']') {
      if (openStack.length) pairs.push({ start: openStack.pop()!, end: i })
      else warnings.push(`Unmatched ']' at index ${i} (kept as literal)`)
    }
  }
  for (const pos of openStack) warnings.push(`Unclosed '[' at index ${pos} (kept as literal)`)
  // Keep only pairs not contained within another pair (top-level), by start order.
  pairs.sort((a, b) => a.start - b.start)
  const out: BracketSpan[] = []
  let lastEnd = -1
  for (const p of pairs) {
    if (p.start > lastEnd) {
      out.push({ start: p.start, end: p.end + 1, content: s.slice(p.start + 1, p.end) })
      lastEnd = p.end
    }
  }
  return out
}

function isSmartlink(trimmed: string): boolean {
  const lower = trimmed.toLowerCase()
  if (/^pfs[_ ]/.test(lower)) return true
  // Exact match, or a known stem followed by a word boundary (space) -> covers
  // "Vital Signs 2012", "Patient Gender (Male/Female)". Bare startsWith is too
  // greedy ([dobutamine], [Provider Name] are NOT smartlinks).
  if (SMARTLINK_EXACT.has(lower)) return true
  return SMARTLINK_PREFIXES.some((p) => lower.startsWith(p + ' '))
}

function looksLikeAnnotation(trimmed: string): boolean {
  if (/[—–]/.test(trimmed)) return true // contains em/en dash -> our inserted notes
  if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) return true // dated reviewer note ("Added 2026-06-14 ...")
  if (/\bspecify\b/i.test(trimmed)) return true
  return false
}

/** Loose keyword match (no delimiter required) — used together with annotation markers. */
function looseKeyword(trimmed: string): string | null {
  const m = trimmed.match(/^(CONFIRM|TEMPLATE NOTE|TITLE CHECK|ADDED|NOTE|HEADER)\b/i)
  if (!m) return null
  const k = m[1].toUpperCase()
  return k === 'NOTE' || k === 'HEADER' ? 'NOTE' : k
}

function flagTypeOf(trimmed: string): string | null {
  // Strong reviewer keywords essentially never start clinical prose -> prefix match.
  const strong = trimmed.match(/^(CONFIRM|TEMPLATE NOTE|TITLE CHECK)\b/i)
  if (strong) return strong[1].toUpperCase()
  // Weak keywords (ADDED/NOTE/HEADER) DO start ordinary prose ("[Note the patient ...]",
  // "[Added per attending ...]"). Only treat as a strip-flag when the keyword stands alone
  // or is followed by a ':'/dash delimiter, so real bracketed prose is never silently deleted.
  const weak = trimmed.match(/^(ADDED|NOTE|HEADER)(\s*[:\-—–]|$)/i)
  if (weak) return weak[1].toUpperCase() === 'ADDED' ? 'ADDED' : 'NOTE'
  return null
}

const UNIT_LOOKAHEAD = /^\s*-?\s*(mm|cc|ncm|degrees|deg)\b/i

function normalizeUnit(u: string): MeasurementUnit {
  const l = u.toLowerCase()
  if (l === 'mm') return 'mm'
  if (l === 'cc') return 'cc'
  if (l === 'ncm') return 'Ncm'
  if (l === 'degrees' || l === 'deg') return 'degrees'
  return null
}

/** Classify all top-level bracket spans into RawTokens (merging compounds). */
function classifyBrackets(brackets: BracketSpan[], full: string, warnings: string[]): RawToken[] {
  const tokens: RawToken[] = []
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i]
    const trimmed = b.content.trim()
    const raw = full.slice(b.start, b.end)

    // Compound: [diameter]x[length]
    if (/^diameter$/i.test(trimmed) && i + 1 < brackets.length) {
      const next = brackets[i + 1]
      const between = full.slice(b.end, next.start).trim()
      if (/^x$/i.test(between) && /^length$/i.test(next.content.trim())) {
        tokens.push({ start: b.start, end: next.end, kind: 'hardwareDim', raw: full.slice(b.start, next.end) })
        i++ // consume the [length]
        continue
      }
    }

    // Markdown link: "[text](url)" — keep the whole thing inline, never a field.
    if (full[b.end] === '(') {
      tokens.push({ start: b.start, end: b.end, kind: 'flag', raw, flagType: 'NOTE', strip: false, surface: false })
      continue
    }
    // Markdown task checkbox at a list-item start: "- [ ] ...", "- [x] ...". Keep inline.
    // Guarded by an actual list marker so a leading "[X] mm" measurement is unaffected.
    if (/^[xX ]?$/.test(b.content)) {
      const linePrefix = full.slice(full.lastIndexOf('\n', b.start - 1) + 1, b.start)
      if (/^\s*[-*]\s+$/.test(linePrefix)) {
        tokens.push({ start: b.start, end: b.end, kind: 'flag', raw, flagType: 'NOTE', strip: false, surface: false })
        continue
      }
    }

    const flagType = flagTypeOf(trimmed)
    if (flagType) {
      // Recognized reviewer flag (keyword + delimiter): surface it AND strip it from the body.
      tokens.push({ start: b.start, end: b.end, kind: 'flag', raw, flagType, strip: true, surface: true })
      continue
    }
    const annotationLike = looksLikeAnnotation(trimmed)
    const loose = looseKeyword(trimmed)
    if (loose && annotationLike) {
      // Keyword + annotation markers (dash/date), e.g. "[Added 2026-06-14 — ...]": a genuine
      // reviewer annotation -> surface AND strip. (Bare "[Added per attending]" has no markers,
      // so it falls through and is kept inline rather than silently deleted.)
      tokens.push({ start: b.start, end: b.end, kind: 'flag', raw, flagType: loose, strip: true, surface: true })
      continue
    }
    if (annotationLike) {
      // Inserted note (dash/date/"specify") without a keyword: surface but keep inline (no data loss).
      tokens.push({ start: b.start, end: b.end, kind: 'flag', raw, flagType: 'NOTE', strip: false, surface: true })
      continue
    }
    if (isSmartlink(trimmed)) {
      tokens.push({ start: b.start, end: b.end, kind: 'smartlink', raw })
      continue
    }
    // Side, any spelling/order: [R/L], [L/R], [right/left], [left/right].
    if (/^(right|left|r|l)\s*\/\s*(right|left|r|l)$/i.test(trimmed)) {
      const opts = trimmed.split('/').map((o) => o.trim())
      tokens.push({ start: b.start, end: b.end, kind: 'side', raw, options: opts })
      continue
    }
    if (/^#_+$/.test(trimmed)) {
      tokens.push({ start: b.start, end: b.end, kind: 'toothNumber', raw })
      continue
    }
    if (/^_+$/.test(trimmed)) {
      tokens.push({ start: b.start, end: b.end, kind: 'blank', raw })
      continue
    }
    if (/^#$/.test(trimmed)) {
      tokens.push({ start: b.start, end: b.end, kind: 'hardwareCount', raw })
      continue
    }
    if (/^(X|length)$/i.test(trimmed)) {
      const after = full.slice(b.end)
      const m = after.match(UNIT_LOOKAHEAD)
      tokens.push({
        start: b.start,
        end: b.end,
        kind: 'measurement',
        raw,
        unit: m ? normalizeUnit(m[1]) : null,
      })
      continue
    }
    // Slash-choice enum: [soft / puree / liquid], [nasal/oral], [1%/2%].
    // Only when options are short, single-line, and free of nesting/blanks.
    if (trimmed.includes('/')) {
      const opts = trimmed.split('/').map((o) => o.trim())
      // Reject things that look like a slash but are NOT a choice list: dates
      // ([10/12/2024], [12/2024]), unit fractions ([mg/dL]), and connectives ([and/or]).
      // A 2-option numeric pair IS kept (e.g. bur sizes [701/702], suture [3-0/4-0]).
      const dateLike = (opts.length >= 3 && opts.every((o) => /^\d+$/.test(o))) || opts.some((o) => /^\d{4,}$/.test(o))
      const unitish = opts.some((o) => /^(mg|mcg|g|ml|dl|l|kg|mm|cm|cc|meq|iu|units?)$/i.test(o))
      const connective = opts.length === 2 && opts.every((o) => /^(and|or|with|without|w|wo)$/i.test(o))
      const ok =
        opts.length >= 2 &&
        opts.length <= 5 &&
        !dateLike &&
        !unitish &&
        !connective &&
        opts.every((o) => /^[^:[\]]{1,25}$/.test(o) && !o.includes('__'))
      if (ok) {
        tokens.push({ start: b.start, end: b.end, kind: 'enumText', raw, options: opts, hint: trimmed })
        continue
      }
    }
    // Single named token: [profile], [size], [Attending], [Attending(s)].
    if (/^[A-Za-z][A-Za-z0-9()]*$/.test(trimmed)) {
      tokens.push({ start: b.start, end: b.end, kind: 'text', raw })
      continue
    }
    // Unrecognized bracket -> KEEP inline verbatim (no data loss), warn only.
    warnings.push(`Unrecognized bracket kept inline: ${raw.slice(0, 60)}`)
    tokens.push({ start: b.start, end: b.end, kind: 'flag', raw, flagType: 'NOTE', strip: false, surface: false })
  }
  return tokens
}

function overlapsClaimed(start: number, end: number, claimed: Array<[number, number]>): boolean {
  return claimed.some(([s, e]) => start < e && end > s)
}

/** Derive a short label from the ~6 words preceding the token on its line. */
function deriveLabel(full: string, start: number, kind: Field['kind'], unit?: MeasurementUnit): string {
  const lineStart = full.lastIndexOf('\n', start - 1) + 1
  const preceding = full.slice(lineStart, start).replace(/[#*>-]+/g, ' ').trim()
  let words = preceding.split(/\s+/).filter(Boolean).slice(-6).join(' ')
  if (!words) {
    const after = full.slice(start).replace(/^\{\{[^}]+\}\}/, '')
    words = after.split(/\s+/).filter(Boolean).slice(0, 5).join(' ')
  }
  words = words.slice(0, 48).trim()
  const base = words || defaultLabel(kind)
  return unit ? `${base} (${unit})` : base
}

function defaultLabel(kind: Field['kind']): string {
  switch (kind) {
    case 'side':
      return 'Side'
    case 'toothNumber':
      return 'Tooth #'
    case 'measurement':
      return 'Measurement'
    case 'hardwareCount':
      return 'Count'
    case 'hardwareDim':
      return 'Implant size (d x l)'
    case 'enumText':
      return 'Select'
    case 'text':
      return 'Value'
    default:
      return 'Field'
  }
}

export function tokenize(rawBodyInput: string, componentId: string): TokenizeResult {
  const warnings: string[] = []
  // Strip our private-use sentinels if they somehow appear in source text (e.g. PUA
  // glyphs pasted from an icon font), so they can't corrupt assembly downstream.
  const rawBody = rawBodyInput.replace(new RegExp(`[${S0}${S1}]`, 'g'), '')
  if (rawBody.length !== rawBodyInput.length) warnings.push('Stripped reserved sentinel character(s) from source')
  const brackets = findTopLevelBrackets(rawBody, warnings)
  const bracketTokens = classifyBrackets(brackets, rawBody, warnings)

  const claimed: Array<[number, number]> = bracketTokens.map((t) => [t.start, t.end])
  const tokens: RawToken[] = [...bracketTokens]

  // Includes: .sacxexam, .sacsign, etc. (only in unclaimed regions)
  for (const m of rawBody.matchAll(/\.sac[a-z0-9_]+/gi)) {
    const start = m.index!
    const end = start + m[0].length
    if (overlapsClaimed(start, end, claimed)) continue
    claimed.push([start, end])
    tokens.push({ start, end, kind: 'include', raw: m[0], dotPhrase: m[0] })
  }

  // Underscore blanks with optional choice hint: ___ (a / b / c)
  for (const m of rawBody.matchAll(/_{2,}(\s*\(([^)]*)\))?/g)) {
    const start = m.index!
    const end = start + m[0].length
    if (overlapsClaimed(start, end, claimed)) continue
    claimed.push([start, end])
    const hint = m[2]?.trim()
    if (hint && hint.includes('/')) {
      const options = hint
        .split('/')
        .map((o) => o.trim())
        .filter(Boolean)
      if (options.length >= 2) {
        tokens.push({ start, end, kind: 'enumText', raw: m[0], options, hint })
        continue
      }
    }
    tokens.push({ start, end, kind: 'blank', raw: m[0], hint })
  }

  // Standalone single underscore (not part of a word or longer run).
  for (const m of rawBody.matchAll(/(?<![\w_])_(?![\w_])/g)) {
    const start = m.index!
    const end = start + 1
    if (overlapsClaimed(start, end, claimed)) continue
    claimed.push([start, end])
    tokens.push({ start, end, kind: 'blank', raw: '_' })
  }

  // Sort by position, assign ids/labels, collect flags/includes.
  tokens.sort((a, b) => a.start - b.start)
  const fields: Field[] = []
  const flags: FlagAnnotation[] = []
  const includes: string[] = []
  const smartlinks: string[] = []
  const kindCounts: Record<string, number> = {}

  // Build the template by walking and substituting.
  let out = ''
  let cursor = 0
  for (const t of tokens) {
    out += rawBody.slice(cursor, t.start)
    cursor = t.end
    if (t.kind === 'flag') {
      if (t.surface) {
        flags.push({ type: t.flagType ?? 'NOTE', text: t.raw.replace(/^\[|\]$/g, '').trim() })
      }
      if (!t.strip) out += t.raw // keep content inline; only reviewer annotations are removed
      continue
    }
    if (t.kind === 'smartlink') {
      smartlinks.push(t.raw) // keep verbatim for the EHR; record for the "left for EHR" list
      out += t.raw
      continue
    }
    if (t.kind === 'include') {
      includes.push(t.dotPhrase!)
      out += `${S0}include:${t.dotPhrase}${S1}`
      continue
    }
    const idx = kindCounts[t.kind] ?? 0
    kindCounts[t.kind] = idx + 1
    const id = `${componentId}:${t.kind}:${idx}`
    const field: Field = {
      id,
      kind: t.kind,
      raw: t.raw,
      label: deriveLabel(rawBody, t.start, t.kind, t.unit),
      unit: t.unit,
      options: t.options,
      hint: t.hint,
    }
    if (t.kind === 'side') field.linkKey = 'side'
    if (t.kind === 'hardwareDim') {
      field.subFields = [
        { id: `${id}:d`, kind: 'measurement', raw: '[diameter]', label: 'diameter' },
        { id: `${id}:l`, kind: 'measurement', raw: '[length]', label: 'length' },
      ]
    }
    fields.push(field)
    out += `${S0}${id}${S1}`
  }
  out += rawBody.slice(cursor)

  return { bodyTemplate: out, fields, flags, includes, smartlinks, warnings }
}

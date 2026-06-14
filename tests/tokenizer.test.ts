import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tokenize } from '../src/lib/tokenizer'
import { prepareBody as prep } from '../src/lib/prepare'

function fixture(name: string): string {
  return readFileSync(join(process.cwd(), 'tests/fixtures', name), 'utf8')
}

function prepareBody(raw: string): string {
  return prep(raw).body
}

describe('tokenizer — All-On-6 (stress case)', () => {
  const { fields, flags } = tokenize(fixture('all-on-6.md'), 'all-on-6')

  it('captures the CONFIRM block as a flag, never a field', () => {
    expect(flags.some((f) => f.type === 'CONFIRM')).toBe(true)
    expect(fields.some((f) => f.kind === 'flag')).toBe(false)
  })

  it('does NOT collapse the many distinct [X] measurements', () => {
    const measurements = fields.filter((f) => f.kind === 'measurement')
    expect(measurements.length).toBeGreaterThanOrEqual(10)
    // Each has a distinct id.
    expect(new Set(measurements.map((m) => m.id)).size).toBe(measurements.length)
  })

  it('links every side field under one key', () => {
    const sides = fields.filter((f) => f.kind === 'side')
    expect(sides.length).toBeGreaterThanOrEqual(2)
    expect(sides.every((s) => s.linkKey === 'side')).toBe(true)
  })

  it('parses hardwareDim, toothNumber, and text fields', () => {
    expect(fields.some((f) => f.kind === 'hardwareDim')).toBe(true)
    expect(fields.some((f) => f.kind === 'toothNumber')).toBe(true)
    expect(fields.some((f) => f.kind === 'text')).toBe(true)
  })

  it('strips flag + compound markers from the body template', () => {
    const { bodyTemplate } = tokenize(fixture('all-on-6.md'), 'all-on-6')
    expect(bodyTemplate).not.toContain('[CONFIRM')
    expect(bodyTemplate).not.toContain('[diameter]')
  })
})

describe('tokenizer — ORIF Symphysis (hardware)', () => {
  const { fields } = tokenize(fixture('orif-symphysis.md'), 'orif-symphysis')
  it('parses hardware counts, profile text, and tooth numbers', () => {
    expect(fields.some((f) => f.kind === 'hardwareCount')).toBe(true)
    expect(fields.some((f) => f.kind === 'text')).toBe(true)
    expect(fields.some((f) => f.kind === 'toothNumber')).toBe(true)
  })
})

describe('tokenizer — Consult skeleton (smartlinks + includes)', () => {
  const { fields, includes, bodyTemplate } = tokenize(prepareBody(fixture('consult-skeleton.md')), 'consult')

  it('treats Epic SmartLinks as verbatim, never fields', () => {
    expect(fields.some((f) => f.kind === 'smartlink')).toBe(false)
    expect(fields.some((f) => f.raw.includes('Age') || f.raw.includes('Allergies'))).toBe(false)
    expect(bodyTemplate).toContain('[Age]')
    expect(bodyTemplate).toContain('[Allergies]')
  })

  it('records dot-phrase includes in order', () => {
    expect(includes).toEqual(['.sacxexam', '.sacsign'])
  })

  it('captures the underscore blanks (ASA _, "_", Next visit: _)', () => {
    expect(fields.filter((f) => f.kind === 'blank').length).toBeGreaterThanOrEqual(3)
  })
})

describe('tokenizer — Sinus Precautions component (underscore blanks)', () => {
  const { fields } = tokenize(prepareBody(fixture('sinus-precautions.md')), 'sinus')
  it('parses several ___ blanks and no spurious fields', () => {
    expect(fields.filter((f) => f.kind === 'blank').length).toBeGreaterThanOrEqual(4)
    expect(fields.some((f) => f.kind === 'smartlink')).toBe(false)
  })
})

describe('tokenizer — enumText from a choice hint', () => {
  it('splits "___ (soft / puree / liquid)" into an enum', () => {
    const { fields } = tokenize('Diet: ___ (soft / puree / liquid) for 6 weeks.', 'x')
    const enums = fields.filter((f) => f.kind === 'enumText')
    expect(enums.length).toBe(1)
    expect(enums[0].options).toEqual(['soft', 'puree', 'liquid'])
  })
})

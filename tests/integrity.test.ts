import { describe, it, expect } from 'vitest'
import { ATOMS, COMPONENTS, PULL_SHEETS, OP_TEMPLATES, SKELETONS, ALL_CONTENT } from '../src/content'
import { PROCEDURES, contentById, atomById } from '../src/lib/procedures'
import { buildDocument, type DocKind } from '../src/lib/caseAssembly'
import { parseRx } from '../src/lib/rx'
import { resolveInclude } from '../src/lib/resolve'
import { defaultEncounter } from '../src/lib/encounter'
import { SENTINEL_OPEN, SENTINEL_CLOSE } from '../src/lib/types'

const compIds = new Set(COMPONENTS.map((c) => c.id))
const pullIds = new Set(PULL_SHEETS.map((p) => p.id))

describe('content referential integrity', () => {
  it('every atom link (rx / postop / pullSheet / opTemplate) resolves', () => {
    const dangling: string[] = []
    for (const a of ATOMS) {
      const links = a.links ?? {}
      for (const id of links.rx ?? []) if (!compIds.has(id)) dangling.push(`${a.id} rx -> ${id}`)
      for (const id of links.postop ?? []) if (!compIds.has(id)) dangling.push(`${a.id} postop -> ${id}`)
      if (links.pullSheet && !pullIds.has(links.pullSheet)) dangling.push(`${a.id} pullSheet -> ${links.pullSheet}`)
      if (!contentById(a.id)) dangling.push(`${a.id} opTemplate missing`)
    }
    expect(dangling).toEqual([])
  })

  it('the default Rx component exists and every clinical procedure links a valid Rx', () => {
    expect(compIds.has('post-op-rx')).toBe(true)
    for (const p of PROCEDURES) {
      // Adjunct atoms (closings, specimen/hardware accounting) intentionally carry no Rx.
      const adjunct = /closing|accounting/.test(p.id)
      if (adjunct) {
        expect(p.rxIds.length, `${p.id} adjunct should carry no Rx`).toBe(0)
      } else {
        expect(p.rxIds.length, `${p.id} has no Rx`).toBeGreaterThan(0)
        for (const id of p.rxIds) expect(compIds.has(id), `${p.id} -> ${id} dangling`).toBe(true)
      }
    }
  })

  it('content ids are unique WITHIN each collection and dot phrases are globally unique', () => {
    for (const coll of [ATOMS, COMPONENTS, PULL_SHEETS, OP_TEMPLATES, SKELETONS]) {
      const ids = coll.map((c) => c.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    const dots = ALL_CONTENT.map((c) => c.dotPhrase).filter(Boolean) as string[]
    expect(new Set(dots).size).toBe(dots.length)
  })

  it('a procedure op snippet resolves to the ATOM even when its slug collides with an op template', () => {
    // bsso/otoplasty/etc. exist as both an atom and a standalone op template.
    for (const p of PROCEDURES) {
      const atom = atomById(p.opTemplateId)
      expect(atom, `${p.id} atom snippet missing`).toBeTruthy()
    }
  })
})

describe('assembly invariants — every procedure composes clean output', () => {
  const SENT = new RegExp(`[${SENTINEL_OPEN}${SENTINEL_CLOSE}]`)
  const kinds: DocKind[] = ['opnote', 'preop', 'postop', 'rx', 'pullsheet']

  for (const p of PROCEDURES) {
    it(`${p.id} assembles without leaks`, () => {
      for (const kind of kinds) {
        const { text } = buildDocument([{ instanceId: 'a', procedureId: p.id }], {}, defaultEncounter(), kind)
        expect(SENT.test(text), `${p.id}/${kind} leaked a sentinel`).toBe(false)
        expect(text.includes('[insert .sac'), `${p.id}/${kind} has an unresolved include`).toBe(false)
      }
      const { text: opnote } = buildDocument([{ instanceId: 'a', procedureId: p.id }], {}, defaultEncounter(), 'opnote')
      expect(opnote).toContain(p.name) // op note names the procedure
      expect(opnote).not.toMatch(/\[TEMPLATE:/i) // authoring markers stripped from op notes

      // Procedures that LINK an Rx must produce a non-empty prescription. Adjunct atoms
      // (e.g. closings, specimen/hardware accounting) intentionally carry no Rx (rx: []),
      // so they're exempt — they only ever stack onto a real procedure that supplies it.
      if (p.rxIds.length > 0) {
        const { text: rx } = buildDocument([{ instanceId: 'a', procedureId: p.id }], {}, defaultEncounter(), 'rx')
        const parsed = parseRx(rx)
        expect(parsed.orderCount + parsed.lines.filter((l) => l.kind === 'smartlink').length).toBeGreaterThan(0)
      }
    })
  }
})

describe('include resolution is exact-id, not fuzzy', () => {
  it('aliases resolve to their intended block', () => {
    expect(resolveInclude('.sacsign')?.id).toBe('signature')
    expect(resolveInclude('.sacxexam')?.id).toBe('exam-general')
  })
  it('unknown dot phrases return undefined', () => {
    expect(resolveInclude('.sacnope')).toBeUndefined()
  })
})

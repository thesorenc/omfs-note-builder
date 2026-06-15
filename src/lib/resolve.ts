import type { ParsedComponent } from './types'
import { ALL_CONTENT } from '@/content'

// Resolves a dot-phrase include (e.g. .sacxexam, .sacsign) to a component.
const byDot = new Map<string, ParsedComponent>()
const byId = new Map<string, ParsedComponent>()
for (const c of ALL_CONTENT) {
  if (c.dotPhrase) byDot.set(c.dotPhrase, c)
  byId.set(c.id, c)
}

// Dot phrases with no frontmatter entry are mapped to an EXACT content id (not a
// fuzzy regex over ids), so a future component whose id merely contains "signature"
// or "exam" can never be injected in place of the intended block.
const ALIAS_TO_ID: Record<string, string> = {
  sacsign: 'signature',
  sacxexam: 'exam-general',
}

export function resolveInclude(dotPhrase: string): ParsedComponent | undefined {
  if (byDot.has(dotPhrase)) return byDot.get(dotPhrase)
  const key = dotPhrase.replace(/^\./, '').toLowerCase()
  const aliasId = ALIAS_TO_ID[key]
  if (aliasId) return byId.get(aliasId)
  return undefined
}

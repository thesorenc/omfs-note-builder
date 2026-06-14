import type { ParsedComponent } from './types'
import { ALL_CONTENT } from '@/content'

// Resolves a dot-phrase include (e.g. .sacxexam, .sacsign) to a component.
const byDot = new Map<string, ParsedComponent>()
for (const c of ALL_CONTENT) {
  if (c.dotPhrase) byDot.set(c.dotPhrase, c)
}

export function resolveInclude(dotPhrase: string): ParsedComponent | undefined {
  if (byDot.has(dotPhrase)) return byDot.get(dotPhrase)
  // Alias: signature block skeleton has no frontmatter dot phrase.
  if (/sacsign/i.test(dotPhrase)) {
    return ALL_CONTENT.find((c) => /signature/i.test(c.id))
  }
  if (/sacxexam/i.test(dotPhrase)) {
    return ALL_CONTENT.find((c) => /exam-general/i.test(c.id))
  }
  return undefined
}

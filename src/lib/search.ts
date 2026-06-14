import Fuse from 'fuse.js'
import type { ParsedComponent } from './types'

export function makeSearch(items: ParsedComponent[]): Fuse<ParsedComponent> {
  return new Fuse(items, {
    keys: [
      { name: 'title', weight: 0.5 },
      { name: 'dotPhrase', weight: 0.3 },
      { name: 'category', weight: 0.15 },
      { name: 'tags', weight: 0.15 },
      { name: 'rawBody', weight: 0.1 },
    ],
    threshold: 0.4,
    ignoreLocation: true,
  })
}

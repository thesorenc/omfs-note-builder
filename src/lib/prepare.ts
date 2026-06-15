import matter from 'gray-matter'

export interface PreparedFile {
  frontmatter: Record<string, unknown>
  /** Body with frontmatter, preamble, headings, and callouts stripped. */
  body: string
}

/**
 * Strip frontmatter + Obsidian chrome to get the clean template body.
 * - Components: frontmatter, then a "# title" heading, "> [!tip]" callout, and a
 *   "---" rule precede the body.
 * - Skeletons: an "OMFS TEMPLATE ..." instruction preamble precedes a "---" rule.
 * - Op templates: no frontmatter, no preamble -> kept as-is.
 */
export function prepareBody(raw: string): PreparedFile {
  const parsed = matter(raw)
  const frontmatter = parsed.data ?? {}
  let content = parsed.content
  const hasFrontmatter = Object.keys(frontmatter).length > 0
  const startsWithPreamble = /^\s*OMFS TEMPLATE/i.test(content)

  if (hasFrontmatter || startsWithPreamble) {
    const idx = content.indexOf('\n---\n')
    if (idx >= 0) content = content.slice(idx + 5)
  }

  // Strip markdown headings ("# title") and Obsidian blockquote/callout lines ("> [!tip]").
  // In this vault these are always authoring chrome, never clinical content, so removing
  // them wherever they appear keeps callout syntax out of the rendered notes.
  const body = content
    .split('\n')
    .filter((l) => !/^#\s/.test(l) && !/^>\s?/.test(l))
    .join('\n')
    .trim()

  return { frontmatter, body }
}

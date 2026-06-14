import type { ParsedComponent } from './types'

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Re-serialize a component body to a downloadable .md (drop back into the vault). */
export function exportMarkdown(c: ParsedComponent): void {
  const fm = c.dotPhrase ? `---\ndot_phrase: ${c.dotPhrase}\n---\n\n` : ''
  downloadText(`${c.id}.md`, fm + c.rawBody + '\n', 'text/markdown')
}

/** Export a PowerChart-style Auto Text bundle: dot-phrase -> body. */
export function exportAutoText(items: ParsedComponent[]): void {
  const blocks = items
    .filter((c) => c.dotPhrase)
    .map((c) => `### ${c.dotPhrase}  (${c.title})\n${c.rawBody}\n`)
    .join('\n----------------------------------------\n\n')
  const header =
    'PowerChart Auto Text bundle\nPaste each block into the Auto Text manager under its dot phrase.\n\n'
  downloadText('omfs-autotext.txt', header + blocks)
}

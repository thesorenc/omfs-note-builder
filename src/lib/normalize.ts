// Enforces the Note Writing/CLAUDE.md output contract on assembled text:
// plain text only, no em/en dashes, no inline markdown emphasis, ASCII quotes,
// no NBSP cruft, collapsed blank lines. Section headers and list markers stay.

/** Replace em/en dashes. " - " when space-padded, else a plain hyphen. */
function stripDashes(s: string): string {
  return s
    .replace(/\s+[—–]\s+/g, ' - ')
    .replace(/[—–]/g, '-')
}

/** Remove inline emphasis markers without touching list markers or word content. */
function stripInlineEmphasis(s: string): string {
  // Bold/italic: **text**, __text__, *text*, _text_ (inline, single-line spans).
  s = s.replace(/\*\*([^\n*]+)\*\*/g, '$1')
  s = s.replace(/(?<!\w)__([^\n_]+)__(?!\w)/g, '$1')
  s = s.replace(/(?<![\w*])\*([^\n*]+)\*(?![\w*])/g, '$1')
  s = s.replace(/(?<![\w_])_([^\n_]+)_(?![\w_])/g, '$1')
  // Inline code backticks.
  s = s.replace(/`([^`\n]+)`/g, '$1')
  return s
}

function asciiQuotes(s: string): string {
  return s
    .replace(/[‘’‚‛]/g, "'")
    .replace(/[“”„‟]/g, '"')
    .replace(/…/g, '...')
}

function stripCruft(s: string): string {
  // NBSP -> space; drop lines that are only whitespace/NBSP; trim trailing ws.
  s = s.replace(/\u00A0/g, ' ')
  s = s
    .split('\n')
    .map((line) =>
      line.trim().length === 0
        ? ''
        : // strip trailing ws, then collapse INTERNAL runs of 2+ spaces (e.g. left when an
          // optional clause is omitted from mid-sentence) while preserving leading indentation
          line.replace(/[ \t]+$/g, '').replace(/(\S)[ \t]{2,}/g, '$1 '),
    )
    .join('\n')
  // Collapse 3+ blank lines to a single blank line.
  s = s.replace(/\n{3,}/g, '\n\n')
  return s
}

/** Full plain-text normalization pass for assembled clinical output. */
export function normalizePlainText(input: string): string {
  let s = input
  s = asciiQuotes(s)
  s = stripDashes(s)
  s = stripInlineEmphasis(s)
  s = stripCruft(s)
  return s.trim() + '\n'
}

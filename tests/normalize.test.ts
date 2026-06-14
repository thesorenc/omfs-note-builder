import { describe, it, expect } from 'vitest'
import { normalizePlainText } from '../src/lib/normalize'

describe('normalizePlainText — CLAUDE.md output contract', () => {
  it('removes em/en dashes', () => {
    expect(normalizePlainText('foo — bar')).toBe('foo - bar\n')
    expect(normalizePlainText('pre–post')).toBe('pre-post\n')
  })

  it('strips inline bold/italic/code but keeps content', () => {
    expect(normalizePlainText('a **bold** and *em* and `code` end')).toBe('a bold and em and code end\n')
  })

  it('keeps list markers and headers intact', () => {
    const input = '## Header\n- item one\n- item two'
    expect(normalizePlainText(input)).toBe('## Header\n- item one\n- item two\n')
  })

  it('converts smart quotes and ellipsis to ASCII', () => {
    expect(normalizePlainText('“quote” and ‘q’ and…')).toBe('"quote" and \'q\' and...\n')
  })

  it('collapses NBSP-only lines and 3+ blank lines', () => {
    const input = 'a\n \n\n\n\nb'
    expect(normalizePlainText(input)).toBe('a\n\nb\n')
  })
})

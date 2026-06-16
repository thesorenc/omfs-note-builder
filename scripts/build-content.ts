// Build-time content pipeline: read the Obsidian vault (read-only), parse every
// template into a ParsedComponent, and emit typed JSON bundled into the app.
//
// Usage:
//   VAULT_PATH=/path/to/vault tsx scripts/build-content.ts
//   tsx scripts/build-content.ts --check   (verify committed JSON is up to date)

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareBody } from '../src/lib/prepare'
import { tokenize } from '../src/lib/tokenizer'
import type { ComponentMode, ParsedComponent } from '../src/lib/types'

const DEFAULT_VAULT =
  '/Users/soren/Library/Mobile Documents/iCloud~md~obsidian/Documents/OMFS'
const VAULT = process.env.VAULT_PATH ?? DEFAULT_VAULT
const CHECK = process.argv.includes('--check')
const ALLOW_PARTIAL = process.argv.includes('--allow-partial')

/** Stable, locale-INDEPENDENT id ordering (codepoint, not localeCompare) for reproducible output. */
const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/** Normalize a vault path to a POSIX-style relative path so output is identical across OSes. */
function posixRelative(from: string, to: string): string {
  return relative(from, to).split(sep).join('/')
}

const OUT_DIR = fileURLToPath(new URL('../src/content', import.meta.url))

function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === '_review' || entry === '_archive') continue
      walk(full, out)
    } else if (entry.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.md$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleCaseFolder(folder: string): string {
  return folder.replace(/^\d+\s+/, '').trim()
}

// Patient-facing instruction handouts ONLY. Deliberately an allowlist, not a fuzzy
// match: clinician exams (Exam - Post-Op *), op-procedure snippets (Proc - *), and
// inpatient order sets (Pain - Inpatient) must NOT appear in the patient handout picker.
function isPatientInstruction(filename: string, dotPhrase?: string): boolean {
  const dp = (dotPhrase ?? '').toLowerCase()
  if (/^post-op instructions\b/i.test(filename)) return true // .sacxpi* (extraction/ORIF/MMF/ID)
  if (/^sinus precautions\b/i.test(filename) || dp === '.sacxsinusprecautions') return true
  if (/^post-op rx\b/i.test(filename) || dp === '.sacxrx') return true
  if (/^pain - outpatient\b/i.test(filename) || dp === '.sacxpainout') return true
  return false
}

function componentModes(filename: string, dotPhrase?: string): ComponentMode[] {
  const modes: ComponentMode[] = ['clinical', 'library']
  if (isPatientInstruction(filename, dotPhrase)) modes.unshift('postop')
  return modes
}

function parseFile(
  path: string,
  category: string,
  baseModes: ComponentMode[] | null,
): ParsedComponent {
  // Normalize line endings so a CRLF checkout never changes the generated output.
  const raw = readFileSync(path, 'utf8').replace(/\r\n?/g, '\n')
  const { frontmatter, body } = prepareBody(raw)
  const file = basename(path)
  const dotPhrase = (frontmatter.dot_phrase as string) ?? undefined
  const description = (frontmatter.description as string) ?? undefined
  const tags = Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : []
  const asArr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : v ? [String(v)] : undefined)
  const links =
    frontmatter.pull_sheet || frontmatter.postop || frontmatter.rx || frontmatter.est_time
      ? {
          pullSheet: (frontmatter.pull_sheet as string) ?? undefined,
          postop: asArr(frontmatter.postop),
          rx: asArr(frontmatter.rx),
          est: (frontmatter.est_time as string) ?? undefined,
        }
      : undefined

  const id = slug(file)
  const { bodyTemplate, fields, flags, includes, smartlinks, warnings } = tokenize(body, id)

  // Human title. Dot phrases are EHR shortcuts and must NEVER appear in a title.
  //  - op notes: the PROCEDURE line.
  //  - skeletons: drop the "OMFS Template - " prefix.
  //  - components: the clean filename (already human, e.g. "Post-Op Instructions - Extraction").
  const procMatch = body.match(/^PROCEDURE:\s*(.+)$/m)
  let title: string
  if (procMatch) title = procMatch[1].trim()
  else title = file.replace(/\.md$/, '').replace(/^OMFS Template - /i, '')

  const modes = baseModes ?? componentModes(file, dotPhrase)

  return {
    id,
    dotPhrase,
    title,
    description,
    category: (frontmatter.category as string) ?? category,
    modes,
    sourcePath: posixRelative(VAULT, path),
    bodyTemplate,
    fields,
    flags,
    includes,
    smartlinks,
    links,
    tags,
    rawBody: body,
    warnings,
  }
}

function build() {
  if (!existsSync(VAULT)) {
    // On a deploy host / CI without the vault, the committed JSON is authoritative.
    if (CHECK) {
      console.log(`Vault not present (${VAULT}); skipping drift check (using committed JSON).`)
      process.exit(0)
    }
    console.error(`VAULT_PATH not found: ${VAULT}. Set VAULT_PATH to your OMFS vault.`)
    process.exit(1)
  }

  const components: ParsedComponent[] = []
  const opTemplates: ParsedComponent[] = []
  const skeletons: ParsedComponent[] = []
  const pullSheets: ParsedComponent[] = []

  // Required source subtrees. If the vault root exists but a subtree is missing (e.g. an
  // iCloud-synced vault that hasn't fully downloaded), fail loudly rather than silently
  // emitting truncated JSON that could then be committed as authoritative.
  const compDir = join(VAULT, 'Note Templates', 'Components')
  const nwDir = join(VAULT, 'Note Writing')
  const psDir = join(VAULT, 'Note Templates', 'Pull Sheets')
  const atomDir = join(VAULT, 'Note Templates', 'Procedures')
  const required: Array<[string, string]> = [
    ['Components', compDir],
    ['Note Writing', nwDir],
    ['Pull Sheets', psDir],
    ['Procedures', atomDir],
  ]
  const missing = required.filter(([, d]) => !existsSync(d)).map(([name]) => name)
  if (missing.length && !ALLOW_PARTIAL) {
    console.error(
      `Vault is missing required subtree(s): ${missing.join(', ')}. ` +
        `The vault may be partially synced. Refusing to emit truncated content. ` +
        `Pass --allow-partial to override.`,
    )
    process.exit(1)
  }

  // 1. Components
  for (const f of walk(compDir)) {
    const file = basename(f)
    if (file === 'Components.md' || file === 'Note Templates.md') continue
    const category = file.includes(' - ') ? file.split(' - ')[0].trim() : 'Component'
    components.push(parseFile(f, category, null))
  }

  // 2. Op note templates (folder = category; skip README)
  const opDir = join(VAULT, 'Note Writing', 'Op Note Templates')
  if (existsSync(opDir)) {
    for (const folder of readdirSync(opDir)) {
      const folderPath = join(opDir, folder)
      if (!statSync(folderPath).isDirectory()) continue
      if (folder === '_review' || folder === '_archive') continue
      for (const f of walk(folderPath)) {
        if (basename(f) === 'README.md') continue
        opTemplates.push(parseFile(f, titleCaseFolder(folder), ['opnote', 'library']))
      }
    }
  }

  // 3. Clinical skeletons (existsSync guard so --allow-partial never throws)
  if (existsSync(nwDir)) {
    for (const f of readdirSync(nwDir)) {
      if (/^OMFS Template - .+\.md$/.test(f)) {
        skeletons.push(parseFile(join(nwDir, f), 'Clinical Skeleton', ['clinical', 'library']))
      }
    }
  }

  // 4. Pull sheets (team OR setup sheets)
  for (const f of walk(psDir)) {
    pullSheets.push(parseFile(f, 'Pull Sheet', ['pullsheet', 'library']))
  }

  // 5. Atomic procedures (composable building blocks; the Case builder library)
  const atoms: ParsedComponent[] = []
  for (const f of walk(atomDir)) {
    // category comes from frontmatter; folder name is the fallback
    const folderCat = basename(join(f, '..'))
    atoms.push(parseFile(f, folderCat, ['atom', 'library']))
  }

  // Deterministic order: filesystem readdir order is OS-dependent, so sort every
  // bucket by id before emitting. Without this, --check false-fails across machines.
  components.sort(byId)
  opTemplates.sort(byId)
  skeletons.sort(byId)
  pullSheets.sort(byId)
  atoms.sort(byId)

  // Report
  const all = [...components, ...opTemplates, ...skeletons, ...pullSheets, ...atoms]
  const warned = all.filter((c) => c.warnings.length)
  console.log(
    `Parsed: ${components.length} components, ${opTemplates.length} op templates, ${skeletons.length} skeletons, ${pullSheets.length} pull sheets, ${atoms.length} atoms.`,
  )
  for (const c of warned) {
    for (const w of c.warnings) console.warn(`  warn [${c.id}]: ${w}`)
  }

  // Integrity lint: fail the build on a dangling frontmatter link or an unresolved
  // .sac* include (either would otherwise render literally as "[insert .sacX]" or
  // silently drop a linked handout/Rx at runtime). This is what would have caught
  // the `.sacsign_` typo automatically.
  const componentIds = new Set(components.map((c) => c.id))
  const pullSheetIds = new Set(pullSheets.map((p) => p.id))
  const declaredDots = new Set(all.map((c) => c.dotPhrase).filter(Boolean) as string[])
  const ALIAS_DOTS = new Set(['.sacsign', '.sacxexam']) // mirror src/lib/resolve.ts
  const lintErrors: string[] = []
  for (const a of atoms) {
    const L = a.links ?? {}
    for (const id of L.postop ?? []) if (!componentIds.has(id)) lintErrors.push(`${a.id}: postop link '${id}' resolves to no component`)
    for (const id of L.rx ?? []) if (!componentIds.has(id)) lintErrors.push(`${a.id}: rx link '${id}' resolves to no component`)
    if (L.pullSheet && !pullSheetIds.has(L.pullSheet)) lintErrors.push(`${a.id}: pull_sheet link '${L.pullSheet}' resolves to no pull sheet`)
  }
  for (const c of all) {
    for (const inc of c.includes ?? []) {
      if (!declaredDots.has(inc) && !ALIAS_DOTS.has(inc)) lintErrors.push(`${c.id}: include '${inc}' resolves to no dot_phrase`)
    }
  }
  if (lintErrors.length) {
    console.error('Content integrity errors (dangling links / unresolved includes):')
    for (const e of lintErrors) console.error(`  ${e}`)
    process.exit(1)
  }

  const outputs: Record<string, unknown> = {
    'components.generated.json': components,
    'optemplates.generated.json': opTemplates,
    'skeletons.generated.json': skeletons,
    'pullsheets.generated.json': pullSheets,
    'atoms.generated.json': atoms,
  }

  // Typed index re-export (checked by the drift gate too, so a hand-edited or stale
  // index.ts can't pass while importing the wrong content).
  const index = `// AUTO-GENERATED by scripts/build-content.ts. Do not edit.
import type { ParsedComponent } from '@/lib/types'
import components from './components.generated.json'
import opTemplates from './optemplates.generated.json'
import skeletons from './skeletons.generated.json'
import pullSheets from './pullsheets.generated.json'
import atoms from './atoms.generated.json'

export const COMPONENTS = components as ParsedComponent[]
export const OP_TEMPLATES = opTemplates as ParsedComponent[]
export const SKELETONS = skeletons as ParsedComponent[]
export const PULL_SHEETS = pullSheets as ParsedComponent[]
export const ATOMS = atoms as ParsedComponent[]
export const ALL_CONTENT = [...COMPONENTS, ...OP_TEMPLATES, ...SKELETONS, ...PULL_SHEETS, ...ATOMS]
`

  // Exact bytes that should be on disk for each file.
  const files: Record<string, string> = { 'index.ts': index }
  for (const [name, data] of Object.entries(outputs)) {
    files[name] = JSON.stringify(data, null, 2) + '\n'
  }

  if (CHECK) {
    let drift = false
    for (const [name, expected] of Object.entries(files)) {
      const path = join(OUT_DIR, name)
      // Byte-exact compare (CRLF-normalized): trimming would mask trailing-whitespace drift.
      const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n?/g, '\n') : ''
      if (current !== expected) {
        console.error(`DRIFT: ${name} is out of date. Run npm run build:content.`)
        drift = true
      }
    }
    process.exit(drift ? 1 : 0)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(OUT_DIR, name), content)
  }
  console.log(`Wrote JSON + index to ${relative(process.cwd(), OUT_DIR)}`)
}

build()

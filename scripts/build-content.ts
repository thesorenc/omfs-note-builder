// Build-time content pipeline: read the Obsidian vault (read-only), parse every
// template into a ParsedComponent, and emit typed JSON bundled into the app.
//
// Usage:
//   VAULT_PATH=/path/to/vault tsx scripts/build-content.ts
//   tsx scripts/build-content.ts --check   (verify committed JSON is up to date)

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, existsSync } from 'node:fs'
import { join, basename, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { prepareBody } from '../src/lib/prepare'
import { tokenize } from '../src/lib/tokenizer'
import type { ComponentMode, ParsedComponent } from '../src/lib/types'

const DEFAULT_VAULT =
  '/Users/soren/Library/Mobile Documents/iCloud~md~obsidian/Documents/OMFS'
const VAULT = process.env.VAULT_PATH ?? DEFAULT_VAULT
const CHECK = process.argv.includes('--check')

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
  const raw = readFileSync(path, 'utf8')
  const { frontmatter, body } = prepareBody(raw)
  const file = basename(path)
  const dotPhrase = (frontmatter.dot_phrase as string) ?? undefined
  const description = (frontmatter.description as string) ?? undefined
  const tags = Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : []

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
    category,
    modes,
    sourcePath: relative(VAULT, path),
    bodyTemplate,
    fields,
    flags,
    includes,
    smartlinks,
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

  // 1. Components
  const compDir = join(VAULT, 'Note Templates', 'Components')
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

  // 3. Clinical skeletons
  const nwDir = join(VAULT, 'Note Writing')
  for (const f of readdirSync(nwDir)) {
    if (/^OMFS Template - .+\.md$/.test(f)) {
      skeletons.push(parseFile(join(nwDir, f), 'Clinical Skeleton', ['clinical', 'library']))
    }
  }

  // Report
  const all = [...components, ...opTemplates, ...skeletons]
  const warned = all.filter((c) => c.warnings.length)
  console.log(
    `Parsed: ${components.length} components, ${opTemplates.length} op templates, ${skeletons.length} skeletons.`,
  )
  for (const c of warned) {
    for (const w of c.warnings) console.warn(`  warn [${c.id}]: ${w}`)
  }

  const outputs: Record<string, unknown> = {
    'components.generated.json': components,
    'optemplates.generated.json': opTemplates,
    'skeletons.generated.json': skeletons,
  }

  if (CHECK) {
    let drift = false
    for (const [name, data] of Object.entries(outputs)) {
      const path = join(OUT_DIR, name)
      const current = existsSync(path) ? readFileSync(path, 'utf8') : ''
      if (current.trim() !== JSON.stringify(data, null, 2).trim()) {
        console.error(`DRIFT: ${name} is out of date. Run npm run build:content.`)
        drift = true
      }
    }
    process.exit(drift ? 1 : 0)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  for (const [name, data] of Object.entries(outputs)) {
    writeFileSync(join(OUT_DIR, name), JSON.stringify(data, null, 2) + '\n')
  }
  // Typed index re-export.
  const index = `// AUTO-GENERATED by scripts/build-content.ts. Do not edit.
import type { ParsedComponent } from '@/lib/types'
import components from './components.generated.json'
import opTemplates from './optemplates.generated.json'
import skeletons from './skeletons.generated.json'

export const COMPONENTS = components as ParsedComponent[]
export const OP_TEMPLATES = opTemplates as ParsedComponent[]
export const SKELETONS = skeletons as ParsedComponent[]
export const ALL_CONTENT = [...COMPONENTS, ...OP_TEMPLATES, ...SKELETONS]
`
  writeFileSync(join(OUT_DIR, 'index.ts'), index)
  console.log(`Wrote JSON + index to ${relative(process.cwd(), OUT_DIR)}`)
}

build()

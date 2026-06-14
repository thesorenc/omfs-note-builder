# OMFS Note Builder

A deterministic, zero-PHI web app that turns the OMFS vault's markdown templates into
fillable forms and assembles paste-ready clinical text and patient handouts.

- No backend, no database, no LLM. Fully client-side and offline-capable.
- Handles only generic, non-identifying clinical values (procedure, side, tooth #,
  hardware, measurements). Patient identifiers stay as EHR placeholders for MHS GENESIS.
  Nothing typed in the app is saved or transmitted.

## Modes
- Post-Op Instructions: assemble a patient handout from post-op components (print / PDF).
- Op Note Builder: fill one of the operative templates + header checklist.
- Clinical Note Builder: consult / H&P / follow-up skeletons with dot-phrase includes and a
  "Missing / to confirm" block.
- Library: search all components/templates; copy; export PowerChart Auto Text; download .md.

## Develop
```bash
npm install
npm run build:content      # parse the vault -> src/content/*.generated.json (see VAULT_PATH)
npm run dev                # http://localhost:5173
npm test                   # tokenizer / assembler / normalize / UI smoke tests
```

`build:content` reads the Obsidian vault read-only. The default vault path is the
maintainer's local path; override it elsewhere:
```bash
VAULT_PATH="/path/to/OMFS" npm run build:content
```
The generated JSON under `src/content/` is committed, so production builds and the deploy
host never need the vault. `prebuild` runs `build:content --check` before every `build`:
it fails on drift when the vault is present, and skips cleanly (using committed JSON) when
it is not. CI (`.github/workflows/ci.yml`) runs lint, tests, the drift check, and the build.

## Build & deploy (static)
```bash
npm run build && npm run preview
```
Deploy `dist/` to any static host (Netlify / Vercel: base `/`). The app uses a hash router, so
deep links work with no server rewrites. For GitHub Pages set the base path:
```bash
DEPLOY_BASE=/omfs-note-builder/ npm run build
```

## How content flows
Single source of truth = the vault markdown. `scripts/build-content.ts` parses every template
with `src/lib/tokenizer.ts` (the placeholder parser) into typed `ParsedComponent` JSON.
`src/lib/assembler.ts` fills fields and normalizes output to the CLAUDE.md plain-text contract
(no em-dashes, no markdown emphasis). To sync after editing a template, rerun `build:content`.

## Architecture
- `src/lib/tokenizer.ts` - balanced-bracket placeholder parser (sides, tooth #s, measurements,
  hardware, enums, smartlinks left verbatim, flags surfaced as warnings).
- `src/lib/assembler.ts` + `normalize.ts` - fill + plain-text normalization + missing/header blocks.
- `scripts/build-content.ts` - vault -> JSON pipeline.
- `src/components/` - FieldRenderer, NoteAssembler, OutputPanel, FlagBanner, Picker.
- `src/routes/` - the four modes.

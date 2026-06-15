import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Encounter } from '@/lib/encounter'
import { defaultEncounter } from '@/lib/encounter'
import { ALL_CONTENT } from '@/content'

export interface CaseItem {
  instanceId: string
  procedureId: string
}

// Bump when the persisted SHAPE changes; older sessions are discarded on rehydrate.
const CASE_VERSION = 2

// Field values are keyed by POSITIONAL field id (`componentId:kind:idx`). If the
// underlying templates change between deploys, a stale value could re-bind to a
// different field of the same kind (e.g. an old dose landing in a new slot). This
// cheap signature over every field id changes whenever the content does, so we drop
// stale values rather than silently mis-binding them.
function contentSignature(): string {
  let h = 0
  for (const c of ALL_CONTENT) {
    for (const f of c.fields) {
      const s = f.id
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0
    }
  }
  return String(h >>> 0)
}
const CONTENT_SIG = contentSignature()

interface CaseState {
  items: CaseItem[]
  /** field values keyed `${instanceId}::${fieldKey}` — persisted to sessionStorage (no PHI) */
  values: Record<string, string>
  encounter: Encounter
  seq: number
  add: (procedureId: string) => void
  remove: (instanceId: string) => void
  setValue: (key: string, value: string) => void
  setEncounter: (e: Encounter) => void
  reset: () => void
  countOf: (procedureId: string) => number
}

// Persisted to sessionStorage so a refresh keeps the case. This is NOT PHI:
// the app bars patient identifiers; only procedures/variables/encounter are stored,
// and sessionStorage clears when the tab closes.
export const useCaseStore = create<CaseState>()(
  persist(
    (set, get) => ({
  items: [],
  values: {},
  encounter: defaultEncounter(),
  seq: 1,
  add: (procedureId) =>
    set((s) => ({
      items: [...s.items, { instanceId: `${procedureId}__${s.seq}`, procedureId }],
      seq: s.seq + 1,
    })),
  remove: (instanceId) =>
    set((s) => {
      const values: Record<string, string> = {}
      for (const [key, val] of Object.entries(s.values)) {
        if (!key.startsWith(`${instanceId}::`)) values[key] = val
      }
      return { items: s.items.filter((i) => i.instanceId !== instanceId), values }
    }),
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  setEncounter: (encounter) => set({ encounter }),
  reset: () => set({ items: [], values: {}, encounter: defaultEncounter(), seq: 1 }),
  countOf: (procedureId) => get().items.filter((i) => i.procedureId === procedureId).length,
    }),
    {
      name: 'omfs-case',
      storage: createJSONStorage(() => sessionStorage),
      version: CASE_VERSION,
      partialize: (s) => ({
        items: s.items,
        values: s.values,
        encounter: s.encounter,
        seq: s.seq,
        sig: CONTENT_SIG,
      }),
      // A version mismatch means the stored shape is from older code: discard it.
      migrate: () => undefined as unknown as CaseState,
      // Runs on every rehydrate: drop content-incompatible state and defensively
      // validate shapes so a malformed/legacy blob can never crash assembly.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CaseState> & { sig?: string }
        if (p.sig !== CONTENT_SIG) return current // templates changed -> start fresh
        const items = Array.isArray(p.items)
          ? p.items.filter(
              (i): i is CaseItem =>
                !!i && typeof i.instanceId === 'string' && typeof i.procedureId === 'string',
            )
          : []
        const values =
          p.values && typeof p.values === 'object' ? (p.values as Record<string, string>) : {}
        const encounter: Encounter = { ...defaultEncounter(), ...(p.encounter ?? {}) }
        if (!Array.isArray(encounter.residents) || encounter.residents.length === 0) {
          encounter.residents = ['']
        }
        const seq = typeof p.seq === 'number' && p.seq > 0 ? p.seq : items.length + 1
        return { ...current, items, values, encounter, seq }
      },
    },
  ),
)

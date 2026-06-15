import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Encounter } from '@/lib/encounter'
import { defaultEncounter } from '@/lib/encounter'

export interface CaseItem {
  instanceId: string
  procedureId: string
}

interface CaseState {
  items: CaseItem[]
  /** field values keyed `${instanceId}::${fieldKey}` — in memory only (no PHI persistence) */
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
      partialize: (s) => ({ items: s.items, values: s.values, encounter: s.encounter, seq: s.seq }),
    },
  ),
)

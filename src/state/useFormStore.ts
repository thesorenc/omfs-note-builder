import { create } from 'zustand'
import type { FieldValues } from '@/lib/assembler'

interface FormState {
  values: FieldValues
  setValue: (key: string, value: string) => void
  resetComponent: (componentId: string) => void
  resetAll: () => void
}

// In-memory only. Field values are NEVER persisted (PHI hygiene).
export const useFormStore = create<FormState>((set) => ({
  values: {},
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  resetComponent: (componentId) =>
    set((s) => {
      const next: FieldValues = {}
      for (const [k, v] of Object.entries(s.values)) {
        if (!k.startsWith(`${componentId}:`)) next[k] = v
      }
      return { values: next }
    }),
  resetAll: () => set({ values: {} }),
}))

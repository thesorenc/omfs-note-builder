import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface PrefsState {
  unfilledPolicy: 'keepRaw' | 'blank'
  setUnfilledPolicy: (p: 'keepRaw' | 'blank') => void
}

// UI preferences only. No clinical data is stored here.
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      unfilledPolicy: 'keepRaw',
      setUnfilledPolicy: (unfilledPolicy) => set({ unfilledPolicy }),
    }),
    { name: 'omfs-note-builder-prefs' },
  ),
)

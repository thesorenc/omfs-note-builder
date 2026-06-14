import type { FlagAnnotation } from '@/lib/types'

export function FlagBanner({ flags }: { flags: FlagAnnotation[] }) {
  if (!flags.length) return null
  return (
    <div className="no-print space-y-2">
      {flags.map((f, i) => (
        <div
          key={i}
          className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800"
        >
          <span className="font-semibold">{f.type}:</span> {f.text}
        </div>
      ))}
    </div>
  )
}

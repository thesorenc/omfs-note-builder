import type { FlagAnnotation } from '@/lib/types'

export function FlagBanner({ flags }: { flags: FlagAnnotation[] }) {
  if (!flags.length) return null
  return (
    <div className="no-print">
      {flags.map((f, i) => (
        <div key={i} className="flag-note unresolved">
          <b>{f.type}:</b> {f.text}
        </div>
      ))}
    </div>
  )
}

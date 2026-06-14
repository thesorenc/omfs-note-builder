import { Link } from 'react-router-dom'
import { COMPONENTS, OP_TEMPLATES, SKELETONS } from '@/content'

const cards = [
  {
    to: '/postop',
    title: 'Post-Op Instructions',
    desc: 'Assemble a patient handout from post-op components. Print or PDF.',
  },
  { to: '/opnote', title: 'Op Note Builder', desc: `Fill one of ${OP_TEMPLATES.length} operative templates.` },
  {
    to: '/clinical',
    title: 'Clinical Note Builder',
    desc: `Consult, H&P, follow-up skeletons (${SKELETONS.length}) with includes + missing block.`,
  },
  {
    to: '/library',
    title: 'Component Library',
    desc: `Search ${COMPONENTS.length} components + templates. Copy or export Auto Text.`,
  },
]

export function Home() {
  return (
    <div className="space-y-6">
      <div className="rounded border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <span className="font-semibold">Zero-PHI tool.</span> Fill only generic, non-identifying
        clinical values. Patient identifiers stay as placeholders for MHS GENESIS. Nothing you type
        is saved or transmitted.
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-400 hover:shadow"
          >
            <h2 className="mb-1 text-lg font-semibold text-slate-800">{c.title}</h2>
            <p className="text-sm text-slate-500">{c.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

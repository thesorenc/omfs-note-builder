import { Link } from 'react-router-dom'
import { COMPONENTS, OP_TEMPLATES, SKELETONS } from '@/content'

const cards = [
  {
    to: '/postop',
    code: 'PI',
    title: 'Post-Op Instructions',
    desc: 'Assemble a printable patient handout from post-op components.',
  },
  { to: '/opnote', code: 'OP', title: 'Op Note Builder', desc: `Fill one of ${OP_TEMPLATES.length} operative templates with a live encounter header.` },
  {
    to: '/clinical',
    code: 'CL',
    title: 'Clinical Note Builder',
    desc: `Consult, H&P, and follow-up skeletons (${SKELETONS.length}) with includes and a missing block.`,
  },
  {
    to: '/library',
    code: 'LB',
    title: 'Component Library',
    desc: `Search ${COMPONENTS.length} components and templates. Copy or export PowerChart Auto Text.`,
  },
]

export function Home() {
  return (
    <div className="pane config">
      <div className="config-inner">
        <div className="config-hero">
          <h1>OMFS Notes</h1>
          <p>A deterministic, zero-PHI template engine for operative notes, clinical notes, and patient handouts.</p>
        </div>
        <div className="home-note">
          <b>Zero-PHI tool.</b> Fill only generic, non-identifying clinical values. Patient
          identifiers stay as placeholders for MHS GENESIS. Nothing you type is saved or transmitted.
        </div>
        <div className="home-grid">
          {cards.map((c) => (
            <Link key={c.to} to={c.to} className="home-card">
              <div className="hc-icon">{c.code}</div>
              <h2>{c.title}</h2>
              <p>{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

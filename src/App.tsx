import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useCaseStore } from '@/state/useCaseStore'

const tabs = [
  { to: '/', label: 'Case builder', end: true },
  { to: '/clinical', label: 'Clinical notes' },
  { to: '/library', label: 'Library' },
]

export default function App() {
  const onCaseBuilder = useLocation().pathname === '/'
  const reset = useCaseStore((s) => s.reset)

  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar no-print">
        <h1 className="sr-only">OMFS note builder</h1>
        <nav className="topnav" aria-label="Primary">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
        <span className="spacer" />
        {onCaseBuilder && (
          <button
            className="btn-sm"
            onClick={() => {
              if (window.confirm('Reset the case? This clears all procedures, entered values, and the encounter details.'))
                reset()
            }}
          >
            Reset case
          </button>
        )}
      </header>
      <div className="phi-strip no-print">
        Do not enter patient identifiers (name, MRN, DOB) — leave them as EHR placeholders. Nothing
        is transmitted anywhere; the current case is kept in this browser tab only and clears when
        the tab closes. Close the tab when you’re done on a shared workstation.
      </div>
      <main className="app-main" id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}

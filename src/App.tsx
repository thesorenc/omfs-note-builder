import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Case builder', end: true },
  { to: '/clinical', label: 'Clinical notes' },
  { to: '/library', label: 'Library' },
]

export default function App() {
  return (
    <div className="app">
      <header className="topbar no-print">
        <NavLink to="/" className="brand">
          <span className="mark">Om</span>
          OMFS Notes
          <span className="sub">· Admin Helper</span>
        </NavLink>
        <div className="spacer" />
        <nav className="topnav">
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
      </header>
      <div className="phi-strip no-print">
        Do not enter patient identifiers (name, MRN, DOB) — leave them as EHR placeholders. Nothing
        here is saved or transmitted.
      </div>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}

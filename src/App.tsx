import { NavLink, Outlet } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', end: true },
  { to: '/postop', label: 'Post-Op' },
  { to: '/opnote', label: 'Op Note' },
  { to: '/clinical', label: 'Clinical' },
  { to: '/library', label: 'Library' },
]

export default function App() {
  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <span className="text-sm font-bold text-slate-800">OMFS Note Builder</span>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.end}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 text-sm font-medium ${
                    isActive ? 'bg-sky-100 text-sky-800' : 'text-slate-600 hover:bg-slate-100'
                  }`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="bg-amber-50 px-4 py-1 text-center text-[11px] text-amber-800">
          Do not enter patient identifiers (name, MRN, DOB). Leave them as EHR placeholders.
          Nothing here is saved or transmitted.
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

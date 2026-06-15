import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'
import '@fontsource/hanken-grotesk/700.css'
import '@fontsource/hanken-grotesk/800.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/ibm-plex-mono/600.css'
import '@fontsource/ibm-plex-mono/700.css'
import './index.css'
import './design.css'
import App from './App.tsx'
import { CaseBuilder } from './routes/CaseBuilder.tsx'

// Clickjacking defense-in-depth: a <meta> CSP can't set frame-ancestors and classic
// GitHub Pages can't send headers, so bust out of any cross-origin frame here.
if (window.self !== window.top) {
  try {
    window.top!.location.href = window.self.location.href
  } catch {
    document.documentElement.style.display = 'none'
  }
}
import { ClinicalNoteBuilder } from './routes/ClinicalNoteBuilder.tsx'
import { Library } from './routes/Library.tsx'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <CaseBuilder /> },
      { path: 'clinical', element: <ClinicalNoteBuilder /> },
      { path: 'library', element: <Library /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)

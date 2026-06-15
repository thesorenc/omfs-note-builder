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
import { Home } from './routes/Home.tsx'
import { PostOpInstructions } from './routes/PostOpInstructions.tsx'
import { OpNoteBuilder } from './routes/OpNoteBuilder.tsx'
import { ClinicalNoteBuilder } from './routes/ClinicalNoteBuilder.tsx'
import { Library } from './routes/Library.tsx'

const router = createHashRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: 'postop', element: <PostOpInstructions /> },
      { path: 'opnote', element: <OpNoteBuilder /> },
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

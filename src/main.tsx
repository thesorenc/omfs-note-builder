import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
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

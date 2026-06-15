import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CaseBuilder } from '../src/routes/CaseBuilder'
import { ClinicalNoteBuilder } from '../src/routes/ClinicalNoteBuilder'
import { Library } from '../src/routes/Library'
import { useCaseStore } from '../src/state/useCaseStore'

describe('UI smoke', () => {
  it('Case builder: adding a procedure generates a document with Copy', () => {
    useCaseStore.getState().reset()
    render(
      <MemoryRouter>
        <CaseBuilder />
      </MemoryRouter>,
    )
    expect(screen.getByText('Case builder')).toBeInTheDocument()
    expect(screen.getByText('Attending')).toBeInTheDocument() // encounter bar
    // empty state until a procedure is added
    expect(screen.getByText(/No procedures yet/)).toBeInTheDocument()

    const procButtons = screen.getAllByRole('button')
    const proc = procButtons.find((b) => /ORIF|Extraction|BSSO|Implant|All-On/i.test(b.textContent ?? ''))
    expect(proc).toBeTruthy()
    fireEvent.click(proc!)

    expect(screen.getByRole('button', { name: 'Copy text' })).toBeInTheDocument()
    // document tabs
    expect(screen.getByRole('tab', { name: 'Operative Note' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Pre-op' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Post-op' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Rx' })).toBeInTheDocument()
  })

  it('Clinical notes render with a template', () => {
    render(
      <MemoryRouter>
        <ClinicalNoteBuilder />
      </MemoryRouter>,
    )
    expect(screen.getByText('Clinical note')).toBeInTheDocument()
  })

  it('Library renders items and a count', () => {
    render(
      <MemoryRouter>
        <Library />
      </MemoryRouter>,
    )
    expect(screen.getByText(/items$/)).toBeInTheDocument()
  })
})

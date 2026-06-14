import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { OpNoteBuilder } from '../src/routes/OpNoteBuilder'
import { PostOpInstructions } from '../src/routes/PostOpInstructions'
import { Library } from '../src/routes/Library'

describe('UI smoke', () => {
  it('Op Note Builder renders a template and assembles output', () => {
    render(
      <MemoryRouter>
        <OpNoteBuilder />
      </MemoryRouter>,
    )
    expect(screen.getByText('Op Note Builder')).toBeInTheDocument()
    // The header checklist option should produce the checklist in the output.
    expect(screen.getByText(/OPERATIVE NOTE HEADER/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
  })

  it('Post-Op shows components and builds a handout after selection', () => {
    render(
      <MemoryRouter>
        <PostOpInstructions />
      </MemoryRouter>,
    )
    const buttons = screen.getAllByRole('button')
    const comp = buttons.find((b) => /extraction|orif|sinus|mmf|i&d|rx|pain/i.test(b.textContent ?? ''))
    expect(comp).toBeTruthy()
    fireEvent.click(comp!)
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument()
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

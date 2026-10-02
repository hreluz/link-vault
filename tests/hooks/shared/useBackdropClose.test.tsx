// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { useBackdropClose } from '@/lib/hooks/shared/useBackdropClose'

function Harness({ onClose }: { onClose: () => void }) {
  const backdrop = useBackdropClose(onClose)
  return (
    <div data-testid="backdrop" {...backdrop}>
      <input data-testid="input" />
    </div>
  )
}

function setup() {
  const onClose = vi.fn()
  const { getByTestId } = render(<Harness onClose={onClose} />)
  return { onClose, backdrop: getByTestId('backdrop'), input: getByTestId('input') }
}

describe('useBackdropClose', () => {
  afterEach(cleanup)

  it('closes when the press and release both land on the backdrop', () => {
    const { onClose, backdrop } = setup()

    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not close when a drag starts inside the modal and ends on the backdrop', () => {
    const { onClose, backdrop, input } = setup()

    fireEvent.mouseDown(input)
    fireEvent.click(backdrop)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not close when the click lands inside the modal', () => {
    const { onClose, backdrop, input } = setup()

    fireEvent.mouseDown(backdrop)
    fireEvent.click(input)

    expect(onClose).not.toHaveBeenCalled()
  })

  it('still closes on a real backdrop click after an ignored drag-out', () => {
    const { onClose, backdrop, input } = setup()

    fireEvent.mouseDown(input)
    fireEvent.click(backdrop)
    fireEvent.mouseDown(backdrop)
    fireEvent.click(backdrop)

    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

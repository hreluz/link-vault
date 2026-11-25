import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest runs without `globals`, so Testing Library can't register its own
// automatic cleanup. Unmount every render after each test, or React work
// queued by a still-mounted tree can run after jsdom is torn down
// (`window is not defined`). Test files don't call cleanup themselves.
afterEach(cleanup)

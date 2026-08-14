// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { triggerDownload } from '@/lib/utils/downloadFile'

beforeEach(() => {
  Object.defineProperty(globalThis.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(globalThis.URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  })
})

describe('triggerDownload', () => {
  it('creates an object URL from a blob of the given content and mime type', () => {
    triggerDownload('hello', 'file.txt', 'text/plain')

    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
  })

  it('clicks an anchor with the given filename and revokes the object URL', () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    triggerDownload('hello', 'file.txt', 'text/plain')

    expect(clickSpy).toHaveBeenCalledOnce()
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
  })
})

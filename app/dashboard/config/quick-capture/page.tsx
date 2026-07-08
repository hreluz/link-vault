import type { Metadata } from 'next'
import QuickCaptureClient from './QuickCaptureClient'

export const metadata: Metadata = { title: 'Quick Capture — Link Vault' }

export default function QuickCapturePage() {
  return <QuickCaptureClient />
}

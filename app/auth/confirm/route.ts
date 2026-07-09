import { redirect } from 'next/navigation'
import type { NextRequest } from 'next/server'
import { confirmSignup } from '@/lib/services/auth'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type) {
    const result = await confirmSignup(tokenHash, type)
    if (result.success) redirect(type === 'recovery' ? '/restart-account/confirm' : '/dashboard')
    if (type === 'recovery') redirect('/restart-account?confirmError=1')
  }

  redirect('/login?confirmError=1')
}

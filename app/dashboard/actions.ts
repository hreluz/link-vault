'use server'

import { redirect } from 'next/navigation'
import { signOut } from '@/lib/services/auth'

export async function logoutAction() {
  await signOut()
  redirect('/login')
}

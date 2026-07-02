export function isAdminEmail(email: string | null | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail || !email) return false
  return email.toLowerCase() === adminEmail.toLowerCase()
}

import LogoutButton from './LogoutButton'

export default function DashboardHeader({ userEmail }: { userEmail: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🔖</span>
          <span className="font-semibold text-slate-900">Link Vault</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-slate-500 sm:block">{userEmail}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}

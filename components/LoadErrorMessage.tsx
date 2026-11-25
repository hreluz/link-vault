/** A failed load: the message plus a Try again button (SPEC 28's list-load-error pattern). */
export default function LoadErrorMessage({ message, onRetry, className = '' }: {
  message: string
  onRetry: () => void
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${className}`}>
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-300">
        {message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="focus-ring mt-4 min-h-11 rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100"
      >
        Try again
      </button>
    </div>
  )
}

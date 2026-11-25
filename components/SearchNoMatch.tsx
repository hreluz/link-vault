/** "No … match" state of an in-page search box, with a `Clear search` button (SPEC 41). */
export default function SearchNoMatch({ message, onClear }: { message: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-surface-500 dark:text-surface-400">{message}</p>
      <button
        type="button"
        onClick={onClear}
        className="focus-ring mt-4 min-h-11 rounded-xl border border-surface-200 bg-surface-card px-4 py-2 text-sm font-medium text-surface-600 shadow-sm transition hover:bg-surface-50 hover:text-surface-900 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700 dark:hover:text-surface-100"
      >
        Clear search
      </button>
    </div>
  )
}

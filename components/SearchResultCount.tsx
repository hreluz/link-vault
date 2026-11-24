/**
 * `Showing X of N <noun>s` under an in-page search box (SPEC 41). Always mounted as a
 * `role="status"` region so screen readers hear the count change; empty while not searching.
 */
export default function SearchResultCount({ shown, total, noun, active }: {
  shown: number
  total: number
  noun: string
  active: boolean
}) {
  return (
    <p role="status" className={active ? '-mt-2 mb-4 text-xs text-surface-500 dark:text-surface-400' : 'sr-only'}>
      {active ? `Showing ${shown} of ${total} ${noun}${total !== 1 ? 's' : ''}` : ''}
    </p>
  )
}

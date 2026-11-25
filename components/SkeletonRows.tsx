const BLOCK = 'rounded-lg bg-surface-100 dark:bg-surface-800'

type Props = {
  count: number
  /** `row`: a CollectionRow-sized list row. `card`: a LinkCard-sized card. */
  variant: 'row' | 'card'
  /** Read by screen readers in place of the visual placeholders. */
  label: string
  /** Optional page-header placeholder above the rows. */
  header?: boolean
}

/**
 * Pulsing placeholders shaped like the content that's loading, so the page
 * doesn't jump when it arrives. Announced once as a status with `label`.
 */
export default function SkeletonRows({ count, variant, label, header = false }: Props) {
  return (
    <div role="status" className="animate-pulse motion-reduce:animate-none">
      <span className="sr-only">{label}</span>
      <div aria-hidden="true">
        {header && (
          <div data-testid="skeleton-header" className="mb-6">
            <div className={`${BLOCK} h-8 w-2/3`} />
            <div className={`${BLOCK} mt-2 h-4 w-1/3`} />
            <div className="mt-4 flex gap-2">
              <div className={`${BLOCK} h-11 w-28 rounded-xl`} />
              <div className={`${BLOCK} h-11 w-28 rounded-xl`} />
            </div>
          </div>
        )}
        <div className={variant === 'row' ? 'space-y-2' : 'space-y-4'}>
          {Array.from({ length: count }, (_, i) =>
            variant === 'row' ? (
              <div
                key={i}
                data-testid="skeleton-item"
                className="flex items-center gap-3 rounded-2xl bg-surface-card px-4 py-3.5 shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700"
              >
                <div className={`${BLOCK} h-9 w-9 shrink-0 rounded-xl`} />
                <div className="flex-1 space-y-2">
                  <div className={`${BLOCK} h-3.5 w-1/2`} />
                  <div className={`${BLOCK} h-3 w-1/4`} />
                </div>
              </div>
            ) : (
              <div
                key={i}
                data-testid="skeleton-item"
                className="overflow-hidden rounded-2xl bg-surface-card shadow-sm ring-1 ring-surface-200 dark:bg-surface-900 dark:ring-surface-700"
              >
                <div className="h-32 bg-surface-100 dark:bg-surface-800" />
                <div className="space-y-2 p-4">
                  <div className={`${BLOCK} h-4 w-3/4`} />
                  <div className={`${BLOCK} h-3 w-1/3`} />
                </div>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  )
}

import './Skeleton.css'

/**
 * Placeholders sized to the content they stand in for.
 *
 * Deliberately not a spinner: a spinner occupies no space, so the layout jumps
 * the moment data lands and CLS goes with it. These reserve the real box.
 */

export function SkeletonBar({
  width = '100%',
  height = 12,
}: {
  width?: string
  height?: number
}) {
  return <span className="sk-bar" style={{ width, height }} aria-hidden="true" />
}

/** Same outer shape as a work card, so a grid of them holds the same rows. */
export function WorkCardSkeleton() {
  return (
    <article className="work-card" aria-hidden="true">
      <div className="sk-block work-shot" />
      <div className="work-body sk-body">
        <SkeletonBar width="62%" height={17} />
        <SkeletonBar width="38%" height={12} />
        <SkeletonBar width="100%" height={14} />
        <SkeletonBar width="92%" height={14} />
        <SkeletonBar width="54%" height={14} />
      </div>
    </article>
  )
}

export function ErrorState({
  message,
  onRetry,
  compact = false,
}: {
  message: string
  onRetry: () => void
  compact?: boolean
}) {
  return (
    <div className={`state-note${compact ? ' state-note-compact' : ''}`} role="alert">
      <p className="state-note-text">{message}</p>
      <button className="pill pill-outline" type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="state-note">
      <p className="state-note-text">{message}</p>
    </div>
  )
}

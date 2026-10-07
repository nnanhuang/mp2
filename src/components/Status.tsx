import styles from './Status.module.css'

interface StatusProps {
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyText?: string
  onRetry?: () => void
}

// Shared loading / error / empty-state block used by every view.
export default function Status({ loading, error, empty, emptyText, onRetry }: StatusProps) {
  if (loading) {
    return (
      <div className={styles.status} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        Loading…
      </div>
    )
  }
  if (error) {
    return (
      <div className={`${styles.status} ${styles.error}`} role="alert">
        <p>{error}</p>
        {onRetry && (
          <button type="button" className={styles.retry} onClick={onRetry}>
            Try again
          </button>
        )}
      </div>
    )
  }
  if (empty) {
    return <div className={styles.status}>{emptyText ?? 'No results.'}</div>
  }
  return null
}

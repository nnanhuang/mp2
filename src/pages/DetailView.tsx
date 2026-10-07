import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { errorMessage, getItem, type NasaItem } from '../api/nasa'
import { useBrowse } from '../context/BrowseContext'
import Status from '../components/Status'
import { formatDate } from '../utils/format'
import styles from './DetailView.module.css'

export default function DetailView() {
  const { nasaId = '' } = useParams()
  const navigate = useNavigate()
  const { items, returnTo, label } = useBrowse()

  // Position of this item in the list the user came from (-1 when the page
  // was opened directly from a URL).
  const index = items.findIndex((item) => item.nasaId === nasaId)
  const fromList = index >= 0 ? items[index] : null

  const [fetched, setFetched] = useState<NasaItem | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (fromList) return
    let cancelled = false
    setLoading(true)
    setError(null)
    getItem(nasaId)
      .then((item) => {
        if (cancelled) return
        if (item) setFetched(item)
        else setError(`No image found with ID “${nasaId}”.`)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [nasaId, fromList, reloadKey])

  const item = fromList ?? (fetched?.nasaId === nasaId ? fetched : null)
  const canCycle = index >= 0 && items.length > 1

  // Previous/next wrap around at either end of the list.
  function go(step: number) {
    if (!canCycle) return
    const next = items[(index + step + items.length) % items.length]
    navigate(`/item/${encodeURIComponent(next.nasaId)}`)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <article className={styles.detail}>
      <div className={styles.toolbar}>
        <Link to={index >= 0 ? returnTo : '/'} className={styles.back}>
          ← Back to {index >= 0 ? label : 'search'}
        </Link>

        <div className={styles.pager}>
          <button
            type="button"
            className={styles.navButton}
            onClick={() => go(-1)}
            disabled={!canCycle}
            aria-label="Previous image"
          >
            ‹ Prev
          </button>
          {index >= 0 && (
            <span className={styles.position}>
              {index + 1} / {items.length}
            </span>
          )}
          <button
            type="button"
            className={styles.navButton}
            onClick={() => go(1)}
            disabled={!canCycle}
            aria-label="Next image"
          >
            Next ›
          </button>
        </div>
      </div>

      {index < 0 && !loading && (
        <p className={styles.hint}>Open an image from Search or Gallery to step through results with Prev / Next.</p>
      )}

      <Status loading={loading && !item} error={item ? null : error} onRetry={() => setReloadKey((k) => k + 1)} />

      {item && (
        <div className={styles.layout}>
          <figure className={styles.figure}>
            <img key={item.nasaId} src={item.imageUrl} alt={item.title} className={styles.image} />
            {item.originalUrl && (
              <figcaption>
                <a href={item.originalUrl} target="_blank" rel="noreferrer" className={styles.original}>
                  View full-resolution image ↗
                </a>
              </figcaption>
            )}
          </figure>

          <div className={styles.info}>
            <h1 className={styles.title}>{item.title}</h1>

            <dl className={styles.facts}>
              <dt>Date created</dt>
              <dd>{formatDate(item.dateCreated)}</dd>
              <dt>NASA center</dt>
              <dd>{item.center}</dd>
              {item.photographer && (
                <>
                  <dt>Photographer</dt>
                  <dd>{item.photographer}</dd>
                </>
              )}
              {item.secondaryCreator && (
                <>
                  <dt>Credit</dt>
                  <dd>{item.secondaryCreator}</dd>
                </>
              )}
              {item.location && (
                <>
                  <dt>Location</dt>
                  <dd>{item.location}</dd>
                </>
              )}
              <dt>NASA ID</dt>
              <dd className={styles.mono}>{item.nasaId}</dd>
            </dl>

            {item.description && <p className={styles.description}>{item.description}</p>}

            {item.keywords.length > 0 && (
              <ul className={styles.keywords}>
                {item.keywords.map((k, i) => (
                  <li key={`${k}-${i}`}>
                    <Link to={`/?q=${encodeURIComponent(k)}`} className={styles.keyword}>
                      {k}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

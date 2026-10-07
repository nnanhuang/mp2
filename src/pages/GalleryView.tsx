import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { errorMessage, searchImages, type NasaItem } from '../api/nasa'
import { useBrowse } from '../context/BrowseContext'
import Status from '../components/Status'
import styles from './GalleryView.module.css'

// Each topic is fetched as its own search; an image is tagged with every
// topic whose search returned it. The queries are more specific than the
// labels because e.g. plain "Mars" mostly returns photos of a Mars, PA festival.
const TOPIC_QUERIES: Record<string, string> = {
  Mars: 'mars surface',
  Moon: 'lunar surface',
  Saturn: 'saturn cassini',
  Jupiter: 'jupiter juno',
  Galaxy: 'spiral galaxy',
  Nebula: 'nebula',
  Earth: 'earth from space',
  Astronaut: 'spacewalk',
}
const TOPICS = Object.keys(TOPIC_QUERIES)
const PER_TOPIC = 18

interface GalleryItem extends NasaItem {
  topics: string[]
}

async function loadGallery(): Promise<GalleryItem[]> {
  const settled = await Promise.allSettled(TOPICS.map((t) => searchImages(TOPIC_QUERIES[t], PER_TOPIC)))

  const byId = new Map<string, GalleryItem>()
  settled.forEach((result, i) => {
    if (result.status !== 'fulfilled') return
    for (const item of result.value) {
      const existing = byId.get(item.nasaId)
      if (existing) existing.topics.push(TOPICS[i])
      else byId.set(item.nasaId, { ...item, topics: [TOPICS[i]] })
    }
  })

  if (byId.size === 0) {
    const firstError = settled.find((r) => r.status === 'rejected')
    throw firstError?.reason ?? new Error('No images')
  }
  return [...byId.values()]
}

export default function GalleryView() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  // Selected topics are kept in the URL (?topics=Mars,Moon).
  const [params, setParams] = useSearchParams()
  const selected = useMemo(
    () => (params.get('topics') ?? '').split(',').filter((t) => TOPICS.includes(t)),
    [params],
  )

  const location = useLocation()
  const { setBrowse } = useBrowse()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    loadGallery()
      .then((data) => {
        if (!cancelled) setItems(data)
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
  }, [reloadKey])

  // An image is shown if it matches any selected topic; no selection shows all.
  const visible = useMemo(
    () => (selected.length === 0 ? items : items.filter((item) => item.topics.some((t) => selected.includes(t)))),
    [items, selected],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const item of items) for (const t of item.topics) c[t] = (c[t] ?? 0) + 1
    return c
  }, [items])

  function setSelected(next: string[]) {
    const p = new URLSearchParams(params)
    if (next.length) p.set('topics', next.join(','))
    else p.delete('topics')
    setParams(p, { replace: true })
  }

  function toggle(topic: string) {
    setSelected(selected.includes(topic) ? selected.filter((t) => t !== topic) : [...selected, topic])
  }

  function rememberList() {
    setBrowse({
      items: visible,
      returnTo: location.pathname + location.search,
      label: 'gallery',
    })
  }

  return (
    <section>
      <div className={styles.intro}>
        <h1>Gallery</h1>
        <p>Pick one or more topics to filter the images.</p>
      </div>

      <div className={styles.filters} role="group" aria-label="Filter by topic">
        <button
          type="button"
          className={selected.length === 0 ? styles.chipActive : styles.chip}
          aria-pressed={selected.length === 0}
          onClick={() => setSelected([])}
        >
          All
        </button>
        {TOPICS.map((topic) => {
          const active = selected.includes(topic)
          return (
            <button
              key={topic}
              type="button"
              className={active ? styles.chipActive : styles.chip}
              aria-pressed={active}
              onClick={() => toggle(topic)}
            >
              {topic}
              {counts[topic] !== undefined && <span className={styles.chipCount}>{counts[topic]}</span>}
            </button>
          )
        })}
      </div>

      <Status
        loading={loading}
        error={error}
        empty={!loading && !error && visible.length === 0}
        emptyText="No images match these filters."
        onRetry={() => setReloadKey((k) => k + 1)}
      />

      {!loading && !error && (
        <>
          <p className={styles.count}>
            Showing {visible.length} of {items.length} images
          </p>
          <ul className={styles.grid}>
            {visible.map((item) => (
              <li key={item.nasaId}>
                <Link to={`/item/${encodeURIComponent(item.nasaId)}`} className={styles.tile} onClick={rememberList}>
                  <img src={item.thumbUrl} alt={item.title} loading="lazy" className={styles.image} />
                  <div className={styles.caption}>
                    <span className={styles.title}>{item.title}</span>
                    <span className={styles.tags}>{item.topics.join(' · ')}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

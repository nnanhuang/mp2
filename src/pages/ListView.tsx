import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { errorMessage, searchImages, type NasaItem } from '../api/nasa'
import { useBrowse } from '../context/BrowseContext'
import Status from '../components/Status'
import { formatDate } from '../utils/format'
import styles from './ListView.module.css'

type SortKey = 'title' | 'date' | 'center'
type Order = 'asc' | 'desc'

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'date', label: 'Date created' },
  { value: 'center', label: 'NASA center' },
]

const SUGGESTIONS = ['Apollo', 'Hubble', 'Mars rover', 'Saturn', 'Nebula', 'Artemis']

const DEFAULT_QUERY = 'apollo'
const DEBOUNCE_MS = 350

function compare(a: NasaItem, b: NasaItem, key: SortKey): number {
  switch (key) {
    case 'title':
      return a.title.localeCompare(b.title)
    case 'date':
      return a.dateCreated.localeCompare(b.dateCreated)
    case 'center':
      return a.center.localeCompare(b.center) || a.title.localeCompare(b.title)
  }
}

export default function ListView() {
  // Query, sort and order live in the URL so they survive navigating to a
  // detail page and back.
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? DEFAULT_QUERY
  const sortKey = (params.get('sort') as SortKey) || 'title'
  const order = (params.get('order') as Order) || 'asc'

  const [input, setInput] = useState(query)
  const [results, setResults] = useState<NasaItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const location = useLocation()
  const { setBrowse } = useBrowse()

  function updateParams(changes: Record<string, string>) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [k, v] of Object.entries(changes)) next.set(k, v)
        return next
      },
      { replace: true },
    )
  }

  // Search as you type: wait until the user pauses before querying the API.
  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed === query) return
    const id = setTimeout(() => updateParams({ q: trimmed }), DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [input])

  useEffect(() => {
    if (!query) {
      setResults([])
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    searchImages(query)
      .then((items) => {
        if (!cancelled) setResults(items)
      })
      .catch((err) => {
        if (!cancelled) {
          setResults([])
          setError(errorMessage(err))
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [query, reloadKey])

  const sorted = useMemo(() => {
    const copy = [...results]
    copy.sort((a, b) => compare(a, b, sortKey))
    if (order === 'desc') copy.reverse()
    return copy
  }, [results, sortKey, order])

  function rememberList() {
    setBrowse({
      items: sorted,
      returnTo: location.pathname + location.search,
      label: 'search results',
    })
  }

  return (
    <section>
      <div className={styles.intro}>
        <h1>Search the NASA image library</h1>
        <p>Results update as you type. Click any result to see its details.</p>
      </div>

      <div className={styles.controls}>
        <label className={styles.searchBox}>
          <span className={styles.srOnly}>Search</span>
          <input
            type="search"
            value={input}
            placeholder="Search for galaxies, missions, planets…"
            onChange={(e) => setInput(e.target.value)}
            className={styles.searchInput}
            autoFocus
          />
        </label>

        <div className={styles.sortGroup}>
          <label className={styles.selectLabel}>
            Sort by
            <select
              value={sortKey}
              onChange={(e) => updateParams({ sort: e.target.value })}
              className={styles.select}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <div className={styles.orderToggle} role="group" aria-label="Sort order">
            <button
              type="button"
              className={order === 'asc' ? styles.orderActive : styles.orderButton}
              aria-pressed={order === 'asc'}
              onClick={() => updateParams({ order: 'asc' })}
            >
              ↑ Asc
            </button>
            <button
              type="button"
              className={order === 'desc' ? styles.orderActive : styles.orderButton}
              aria-pressed={order === 'desc'}
              onClick={() => updateParams({ order: 'desc' })}
            >
              ↓ Desc
            </button>
          </div>
        </div>
      </div>

      {!query && (
        <div className={styles.suggestions}>
          <span>Try:</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className={styles.chip} onClick={() => setInput(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {query && !loading && !error && (
        <p className={styles.count}>
          {sorted.length} result{sorted.length === 1 ? '' : 's'} for “{query}”
        </p>
      )}

      <Status
        loading={loading}
        error={error}
        empty={!!query && sorted.length === 0}
        emptyText={`No images found for “${query}”.`}
        onRetry={() => setReloadKey((k) => k + 1)}
      />

      {!loading && !error && (
        <ul className={styles.list}>
          {sorted.map((item) => (
            <li key={item.nasaId}>
              <Link to={`/item/${encodeURIComponent(item.nasaId)}`} className={styles.row} onClick={rememberList}>
                <img src={item.thumbUrl} alt="" loading="lazy" className={styles.thumb} />
                <div className={styles.rowBody}>
                  <h2 className={styles.rowTitle}>{item.title}</h2>
                  <p className={styles.meta}>
                    <span>{formatDate(item.dateCreated)}</span>
                    <span className={styles.badge}>{item.center}</span>
                  </p>
                  {item.description && <p className={styles.description}>{item.description}</p>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

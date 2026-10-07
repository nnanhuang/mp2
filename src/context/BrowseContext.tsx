import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import type { NasaItem } from '../api/nasa'

// Remembers the list of items the user was last looking at (search results or
// filtered gallery) so the detail view's previous/next buttons can step
// through that same list.

interface BrowseState {
  items: NasaItem[]
  // Where to go when the user clicks "Back" from a detail page.
  returnTo: string
  label: string
}

interface BrowseContextValue extends BrowseState {
  setBrowse: (state: BrowseState) => void
}

const STORAGE_KEY = 'nasa-browse'

function loadState(): BrowseState {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved) as BrowseState
  } catch {
    // Storage unavailable or corrupt — start fresh.
  }
  return { items: [], returnTo: '/', label: 'Search' }
}

const BrowseContext = createContext<BrowseContextValue | null>(null)

export function BrowseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BrowseState>(loadState)

  const setBrowse = useCallback((next: BrowseState) => {
    setState(next)
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Ignore — the list just won't survive a page refresh.
    }
  }, [])

  return <BrowseContext.Provider value={{ ...state, setBrowse }}>{children}</BrowseContext.Provider>
}

export function useBrowse(): BrowseContextValue {
  const ctx = useContext(BrowseContext)
  if (!ctx) throw new Error('useBrowse must be used inside BrowseProvider')
  return ctx
}

import axios from 'axios'

// NASA Image and Video Library — https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
// No API key required.
const client = axios.create({
  baseURL: 'https://images-api.nasa.gov',
  timeout: 15000,
})

export interface NasaItem {
  nasaId: string
  title: string
  description: string
  center: string
  dateCreated: string
  keywords: string[]
  photographer?: string
  secondaryCreator?: string
  location?: string
  thumbUrl: string
  imageUrl: string
  originalUrl?: string
}

interface RawLink {
  href: string
  rel: string
  render?: string
}

interface RawData {
  nasa_id: string
  title?: string
  description?: string
  center?: string
  date_created?: string
  keywords?: string[]
  photographer?: string
  secondary_creator?: string
  location?: string
  media_type?: string
}

interface RawItem {
  data: RawData[]
  links?: RawLink[]
}

interface SearchResponse {
  collection: {
    items: RawItem[]
  }
}

// Descriptions sometimes contain HTML markup; show them as plain text.
function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function toNasaItem(raw: RawItem): NasaItem | null {
  const data = raw.data[0]
  const links = raw.links ?? []
  const preview = links.find((l) => l.rel === 'preview')
  if (!data || !preview) return null

  const thumbUrl = preview.href
  const medium = links.find((l) => l.href.includes('~medium.'))
  const original = links.find((l) => l.rel === 'canonical')

  return {
    nasaId: data.nasa_id,
    title: data.title?.trim() || 'Untitled',
    description: stripHtml(data.description ?? ''),
    center: data.center ?? 'Unknown',
    dateCreated: data.date_created ?? '',
    keywords: data.keywords ?? [],
    photographer: data.photographer,
    secondaryCreator: data.secondary_creator,
    location: data.location,
    thumbUrl,
    imageUrl: medium?.href ?? thumbUrl,
    originalUrl: original?.href,
  }
}

// Cache responses in memory so repeated searches (and navigating back and
// forth between views) don't hit the API again.
const cache = new Map<string, NasaItem[]>()

async function search(params: Record<string, string | number>): Promise<NasaItem[]> {
  const key = JSON.stringify(params)
  const cached = cache.get(key)
  if (cached) return cached

  const res = await client.get<SearchResponse>('/search', {
    params: { media_type: 'image', ...params },
  })
  const items = res.data.collection.items
    .map(toNasaItem)
    .filter((item): item is NasaItem => item !== null)
  cache.set(key, items)
  return items
}

export function searchImages(query: string, pageSize = 60): Promise<NasaItem[]> {
  return search({ q: query, page_size: pageSize })
}

export async function getItem(nasaId: string): Promise<NasaItem | null> {
  const items = await search({ nasa_id: nasaId })
  return items[0] ?? null
}

export function errorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED') return 'The NASA API took too long to respond.'
    if (err.response?.status === 429) return 'Too many requests — please wait a moment and try again.'
    if (err.response) return `The NASA API returned an error (${err.response.status}).`
    return 'Could not reach the NASA API. Check your connection.'
  }
  return 'Something went wrong.'
}

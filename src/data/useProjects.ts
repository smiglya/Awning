import { useCallback, useEffect, useState } from 'react'
import { listProjects } from '../api/index'
import { ApiError } from '../api/errors'
import type { Project } from '../api/types'

/**
 * The one shared query on the site.
 *
 * Hand-written rather than TanStack Query (~13 kB gzip): there is a single
 * query, its two consumers sit on different routes and never mount together,
 * and there are no mutations to invalidate. What is actually needed —
 * deduplication, a cache that survives route changes, abort on unmount and an
 * explicit retry — is about sixty lines. Revisit if a second query with
 * invalidation appears.
 */

export type ProjectsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; projects: Project[]; sample: boolean }

interface CacheEntry {
  projects: Project[]
  sample: boolean
}

let cache: CacheEntry | null = null
let inflight: Promise<CacheEntry> | null = null

function load(signal: AbortSignal): Promise<CacheEntry> {
  // deduplicate: a second mount during the first fetch joins it
  if (inflight) return inflight

  inflight = listProjects({ signal })
    .then((result) => {
      const entry: CacheEntry = {
        projects: result.projects,
        sample: result.sample ?? false,
      }
      cache = entry
      return entry
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}

/** Test seam and retry hook: forget what was fetched. */
export function clearProjectsCache(): void {
  cache = null
  inflight = null
}

export function useProjects(): { state: ProjectsState; retry: () => void } {
  const [state, setState] = useState<ProjectsState>(() =>
    cache
      ? { status: 'ready', projects: cache.projects, sample: cache.sample }
      : { status: 'loading' }
  )
  const [attempt, setAttempt] = useState(0)

  const retry = useCallback(() => {
    clearProjectsCache()
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    // A cache hit resolves on a microtask rather than synchronously, so this
    // never sets state inside the effect body. The initialiser above has
    // already rendered the cached data, so there is no loading flash either.
    const pending = cache ? Promise.resolve(cache) : load(controller.signal)

    pending
      .then((entry) => {
        if (!active) return
        setState({ status: 'ready', projects: entry.projects, sample: entry.sample })
      })
      .catch((error: unknown) => {
        if (!active) return
        const message =
          error instanceof ApiError
            ? error.code === 'contract'
              ? 'The server sent an unexpected response.'
              : 'Could not reach the server.'
            : 'Something went wrong loading this.'
        setState({ status: 'error', message })
      })

    return () => {
      active = false
      controller.abort()
    }
  }, [attempt])

  return { state, retry }
}

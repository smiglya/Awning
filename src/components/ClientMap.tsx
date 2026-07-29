import { useMemo, useState, type ReactNode } from 'react'
import { BOROUGHS, MAP_VIEWBOX, NEIGHBOURHOODS, type Point } from '../data/nycMap'
import { useProjects } from '../data/useProjects'
import { EmptyState, ErrorState, SkeletonBar } from './Skeleton'
import type { Project } from '../api/types'
import './ClientMap.css'

const FILTERS = ['All five boroughs', ...BOROUGHS.map((b) => b.name)]
const ALL_FILTER = FILTERS[0] ?? 'All five boroughs'

function coordsFor(client: Project): Point | null {
  return NEIGHBOURHOODS[client.neighbourhood] ?? null
}

/** Boroughs render immediately; only the pins and the card wait on data. */
function MapShell({ children }: { children?: ReactNode }) {
  return (
    <div className="map-canvas">
      <svg
        viewBox={MAP_VIEWBOX}
        className="map-svg"
        role="img"
        aria-label="Schematic map of New York City with client locations"
      >
        {BOROUGHS.map((borough) => (
          <polygon key={borough.name} points={borough.points} className="map-borough" />
        ))}
        {BOROUGHS.map((borough) => (
          <text
            key={`${borough.name}-label`}
            x={borough.labelX}
            y={borough.labelY}
            textAnchor={borough.labelAnchor}
            className="map-borough-label"
          >
            {borough.name}
          </text>
        ))}
        {children}
      </svg>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <aside className="map-detail" aria-hidden="true">
      <article className="map-card sk-card">
        <div className="sk-block map-shot" />
        <SkeletonBar width="58%" height={20} />
        <SkeletonBar width="34%" height={13} />
        <SkeletonBar width="100%" height={14} />
        <SkeletonBar width="76%" height={14} />
      </article>
    </aside>
  )
}

export default function ClientMap() {
  const { state, retry } = useProjects()
  const [filter, setFilter] = useState<string>(ALL_FILTER)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const all = state.status === 'ready' ? state.projects : []

  const visible = useMemo(() => {
    if (filter === ALL_FILTER) return all
    return all.filter((client) => client.borough === filter)
  }, [all, filter])

  const selected =
    visible.find((client) => client.id === selectedId) ?? visible[0] ?? null

  const handleFilter = (next: string) => {
    setFilter(next)
    const first =
      next === ALL_FILTER ? all[0] : all.find((client) => client.borough === next)
    setSelectedId(first?.id ?? null)
  }

  if (state.status === 'error') {
    return (
      <div className="map-wrap">
        <MapShell />
        <ErrorState message={state.message} onRetry={retry} />
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div className="map-wrap">
        <div className="map-filters" aria-hidden="true">
          {FILTERS.map((option) => (
            <span className="map-filter" key={option}>
              {option}
            </span>
          ))}
        </div>
        <div className="map-layout">
          <MapShell />
          <DetailSkeleton />
        </div>
      </div>
    )
  }

  if (all.length === 0) {
    return (
      <div className="map-wrap">
        <MapShell />
        <EmptyState message="No builds are on the map yet." />
      </div>
    )
  }

  return (
    <div className="map-wrap">
      <div className="map-filters">
        {FILTERS.map((option) => (
          <button
            className={`map-filter${filter === option ? ' map-filter-on' : ''}`}
            type="button"
            key={option}
            onClick={() => handleFilter(option)}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="map-layout">
        <div>
          <MapShell>
            {visible.map((client) => {
              const point = coordsFor(client)
              if (!point) return null
              const isActive = selected !== null && client.id === selected.id
              return (
                <g
                  key={client.id}
                  className={`map-pin${isActive ? ' map-pin-on' : ''}`}
                  transform={`translate(${point.x} ${point.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${client.client}, ${client.neighbourhood}`}
                  onClick={() => setSelectedId(client.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      setSelectedId(client.id)
                    }
                  }}
                >
                  <circle className="map-pin-hit" r="16" />
                  <circle className="map-pin-dot" r={isActive ? 7 : 5} />
                </g>
              )
            })}
          </MapShell>

          <p className="map-note">
            Schematic map, not to scale. {all.length} sample builds shown.
          </p>
        </div>

        <aside className="map-detail">
          {selected ? (
            <article className="map-card">
              <div className="ph map-shot">
                <span className="ph-label">Screenshot — {selected.client}</span>
              </div>

              <div className="map-card-head">
                <h2 className="map-card-title">{selected.client}</h2>
                <span className="map-card-cat">{selected.category}</span>
              </div>

              <p className="map-card-where">
                {selected.neighbourhood}, {selected.borough}
              </p>

              <p className="map-card-blurb">{selected.blurb}</p>

              <dl className="map-card-facts">
                <div className="map-fact">
                  <dt>Price</dt>
                  <dd>{selected.price}</dd>
                </div>
                <div className="map-fact">
                  <dt>Built in</dt>
                  <dd>{selected.days}</dd>
                </div>
                <div className="map-fact">
                  <dt>Pages</dt>
                  <dd>{selected.pages}</dd>
                </div>
              </dl>
            </article>
          ) : (
            <p className="map-empty">No builds in this borough yet.</p>
          )}
        </aside>
      </div>

      <ul className="map-list">
        {visible.map((client) => (
          <li key={client.id}>
            <button
              className={`map-list-row${
                selected !== null && client.id === selected.id ? ' map-list-row-on' : ''
              }`}
              type="button"
              onClick={() => setSelectedId(client.id)}
            >
              <span className="map-list-name">{client.client}</span>
              <span className="map-list-meta">
                {client.neighbourhood} · {client.category}
              </span>
              <span className="map-list-price">{client.price}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

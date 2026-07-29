import type { ReactNode } from 'react'

/**
 * House icon set. One 24x24 grid, 1.25 stroke, currentColor, no fills.
 *
 * Drawn rather than imported so the whole set shares a geometry: straight runs,
 * right angles, and small solid nodes for emphasis. Reads as instrumentation,
 * not as friendly rounded UI clip-art.
 */

export interface IconProps {
  size?: number
  className?: string
}

function Svg({ children, size = 24, className }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

/* --------------------------------------------------------------- why us */

/** Found on the map: concentric sweep around a pin. */
export const IconRadar = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="2.25" />
    <path d="M12 9.75V3.5" />
    <path d="M5.6 18.4a9 9 0 0 1 0-12.8" />
    <path d="M18.4 5.6a9 9 0 0 1 0 12.8" />
    <path d="M8.5 15.5a5 5 0 0 1 0-7" />
    <path d="M15.5 8.5a5 5 0 0 1 0 7" />
  </Svg>
)

/** Nothing monthly: the recurrence loop, cut. */
export const IconNoLoop = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 12a7.5 7.5 0 0 1 12.3-5.8" />
    <path d="M19.5 12a7.5 7.5 0 0 1-12.3 5.8" />
    <path d="M17 3.2v3.4h-3.4" />
    <path d="M7 20.8v-3.4h3.4" />
    <path d="M4 20 20 4" />
  </Svg>
)

/** We do the writing: a draft with a caret sitting in it. */
export const IconDraft = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5.5 3.5h9l4.5 4.5v12a.5.5 0 0 1-.5.5h-13a.5.5 0 0 1-.5-.5v-16a.5.5 0 0 1 .5-.5Z" />
    <path d="M14.5 3.5V8h4.5" />
    <path d="M8.5 12.5h7" />
    <path d="M8.5 16h4.5" />
    <path d="M16.5 15v2.5" />
  </Svg>
)

/** Two languages: the same block, twice, offset. */
export const IconTwoTongues = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3.5 5.5h9v7h-4l-2.5 2.5v-2.5h-2.5Z" />
    <path d="M11.5 9.5h9v7h-2.5V19L15.5 16.5h-4" />
    <path d="M6 9h4" />
    <path d="M14.5 13h4" />
  </Svg>
)

/* ----------------------------------------------------------- full cycle */

export const IconBrief = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="6.5" width="17" height="13" rx="1" />
    <path d="M9 6.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" />
    <path d="M3.5 11.5h17" />
    <circle cx="12" cy="15.5" r="1.1" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconLayout = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
    <path d="M3.5 9h17" />
    <path d="M10 9v10.5" />
    <path d="M13 12.5h4.5" />
    <path d="M13 15.5h4.5" />
  </Svg>
)

/** Motion: an arc with the moving node still on it. */
export const IconMotion = (props: IconProps) => (
  <Svg {...props}>
    <path d="M3.5 17.5c4-9 9.5-11.5 17-9" strokeDasharray="1.5 2.5" />
    <circle cx="17.5" cy="8" r="2.4" fill="currentColor" stroke="none" />
    <path d="M3.5 20.5h6" />
  </Svg>
)

export const IconBuild = (props: IconProps) => (
  <Svg {...props}>
    <path d="M8.5 8 4 12l4.5 4" />
    <path d="M15.5 8 20 12l-4.5 4" />
    <path d="M13.5 4.5 10.5 19.5" />
  </Svg>
)

export const IconContent = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1" />
    <path d="M3.5 15.5 8 11l3.5 3.5L15 11l5.5 5.5" />
    <circle cx="8.5" cy="8.5" r="1.4" />
  </Svg>
)

/** Server: rack units, one live. */
export const IconServer = (props: IconProps) => (
  <Svg {...props}>
    <rect x="3.5" y="4" width="17" height="6" rx="1" />
    <rect x="3.5" y="14" width="17" height="6" rx="1" />
    <circle cx="7" cy="7" r="1.05" fill="currentColor" stroke="none" />
    <circle cx="7" cy="17" r="1.05" fill="currentColor" stroke="none" />
    <path d="M11 7h6" />
    <path d="M11 17h6" />
  </Svg>
)

/* --------------------------------------------------------------- region */

export const IconGlobe = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5Z" />
  </Svg>
)

export const IconPin = (props: IconProps) => (
  <Svg {...props}>
    <path d="M12 21c4-4.6 6-8 6-10.6A6 6 0 0 0 6 10.4C6 13 8 16.4 12 21Z" />
    <circle cx="12" cy="10.3" r="2.2" />
  </Svg>
)

/* ------------------------------------------------------------ utilities */

export const IconArrow = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 12h15" />
    <path d="M13.5 6l6 6-6 6" />
  </Svg>
)

export const IconCheck = (props: IconProps) => (
  <Svg {...props}>
    <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
  </Svg>
)

/* ------------------------------------------------- footer social glyphs */

export const IconNode = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="6" r="2.4" />
    <circle cx="6" cy="17" r="2.4" />
    <circle cx="18" cy="17" r="2.4" />
    <path d="M10.4 8 7.4 14.8" />
    <path d="M13.6 8l3 6.8" />
  </Svg>
)

export const IconSignal = (props: IconProps) => (
  <Svg {...props}>
    <path d="M5 15.5v3" />
    <path d="M9.6 11.5v7" />
    <path d="M14.3 8v10.5" />
    <path d="M19 4.5v14" />
  </Svg>
)

export const IconFrame = (props: IconProps) => (
  <Svg {...props}>
    <rect x="4.5" y="4.5" width="15" height="15" rx="1" />
    <path d="M4.5 9.5h15" />
    <path d="M9.5 4.5v15" />
  </Svg>
)

export const IconOrbit = (props: IconProps) => (
  <Svg {...props}>
    <circle cx="12" cy="12" r="3.2" />
    <ellipse cx="12" cy="12" rx="9" ry="4.2" transform="rotate(-30 12 12)" />
  </Svg>
)

export const SOCIAL_ICONS: Array<(props: IconProps) => ReactNode> = [
  IconNode,
  IconSignal,
  IconFrame,
  IconOrbit,
]

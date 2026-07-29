/**
 * Schematic New York City geometry for the client map.
 *
 * Deliberately NOT geographically accurate — these are simplified polygons
 * drawn to be recognisable at a glance, with no map library, no tile server
 * and no network requests. Everything renders as inline SVG in one colour.
 *
 * Coordinate space is the viewBox below. Client pins reference NEIGHBOURHOODS
 * by name so pin placement can never drift out of its borough.
 */

export const MAP_VIEWBOX = '0 0 1000 760'

export interface Borough {
  name: string
  points: string
  labelX: number
  labelY: number
  labelAnchor: 'start' | 'middle' | 'end'
}

export interface Point {
  x: number
  y: number
}

export const BOROUGHS: Borough[] = [
  {
    name: 'The Bronx',
    points:
      '472,248 500,206 552,182 616,180 662,206 668,250 634,282 574,296 516,296 486,278',
    labelX: 590,
    labelY: 166,
    labelAnchor: 'middle',
  },
  {
    name: 'Manhattan',
    points:
      '454,254 472,250 484,304 494,356 496,406 484,450 468,470 456,456 448,406 446,352 448,300',
    labelX: 428,
    labelY: 344,
    labelAnchor: 'end',
  },
  {
    name: 'Queens',
    points:
      '572,312 624,270 690,258 786,268 872,306 892,364 872,412 806,436 726,446 652,438 596,414 570,364',
    labelX: 800,
    labelY: 372,
    labelAnchor: 'middle',
  },
  {
    name: 'Brooklyn',
    points:
      '516,478 556,424 596,414 652,438 726,446 748,486 736,548 686,596 616,620 556,606 518,554',
    labelX: 668,
    labelY: 574,
    labelAnchor: 'middle',
  },
  {
    name: 'Staten Island',
    points: '248,566 300,542 366,556 398,590 392,640 344,676 282,672 244,628',
    labelX: 320,
    labelY: 706,
    labelAnchor: 'middle',
  },
]

/** Anchor points, each verified to sit inside its borough polygon. */
export const NEIGHBOURHOODS: Record<string, Point> = {
  // Manhattan
  Inwood: { x: 462, y: 258 },
  'Washington Heights': { x: 464, y: 278 },
  Harlem: { x: 466, y: 304 },
  'Upper West Side': { x: 458, y: 330 },
  'Upper East Side': { x: 478, y: 330 },
  Midtown: { x: 470, y: 362 },
  Chelsea: { x: 462, y: 382 },
  'East Village': { x: 478, y: 414 },
  SoHo: { x: 466, y: 424 },
  'Lower East Side': { x: 480, y: 428 },
  Tribeca: { x: 462, y: 438 },
  'Financial District': { x: 470, y: 456 },

  // The Bronx
  Riverdale: { x: 508, y: 246 },
  'Mott Haven': { x: 508, y: 282 },
  Fordham: { x: 562, y: 236 },
  Belmont: { x: 588, y: 254 },
  'Pelham Bay': { x: 630, y: 232 },
  'Throgs Neck': { x: 640, y: 262 },

  // Queens
  Astoria: { x: 606, y: 322 },
  'Long Island City': { x: 588, y: 348 },
  Sunnyside: { x: 614, y: 358 },
  'Jackson Heights': { x: 652, y: 340 },
  Elmhurst: { x: 650, y: 376 },
  Corona: { x: 676, y: 352 },
  Flushing: { x: 708, y: 306 },
  'Forest Hills': { x: 664, y: 398 },
  Ridgewood: { x: 622, y: 400 },
  Jamaica: { x: 742, y: 414 },
  Bayside: { x: 798, y: 340 },
  'Far Rockaway': { x: 826, y: 414 },

  // Brooklyn
  Greenpoint: { x: 566, y: 436 },
  Williamsburg: { x: 560, y: 456 },
  Dumbo: { x: 536, y: 478 },
  Bushwick: { x: 614, y: 452 },
  'Bed-Stuy': { x: 604, y: 484 },
  'Crown Heights': { x: 632, y: 502 },
  'Red Hook': { x: 542, y: 516 },
  'Park Slope': { x: 572, y: 506 },
  'Sunset Park': { x: 552, y: 542 },
  'Bay Ridge': { x: 540, y: 566 },
  Flatbush: { x: 628, y: 542 },
  Canarsie: { x: 692, y: 548 },
  'Coney Island': { x: 596, y: 598 },
  'Brighton Beach': { x: 632, y: 600 },

  // Staten Island
  'Port Richmond': { x: 290, y: 570 },
  'St. George': { x: 338, y: 570 },
  Stapleton: { x: 348, y: 592 },
  'New Dorp': { x: 356, y: 620 },
  'Great Kills': { x: 312, y: 644 },
  Tottenville: { x: 282, y: 652 },
}

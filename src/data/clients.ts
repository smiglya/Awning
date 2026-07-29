/**
 * PLACEHOLDER SAMPLE DATA — not real clients.
 *
 * Every entry below is invented to demonstrate the map and portfolio layouts.
 * Replace all of it with real work before this site goes live; publishing
 * fabricated client names alongside real prices would be misleading.
 *
 * `neighbourhood` must match a key in nycMap.js NEIGHBOURHOODS, or the pin
 * will not render.
 */

import type { Project } from '../api/types'

export const CLIENTS: Project[] = [
  {
    id: 'c1',
    client: 'Knickerbocker Pizza',
    category: 'Pizzeria',
    neighbourhood: 'Bushwick',
    borough: 'Brooklyn',
    price: '$450',
    days: '1 day',
    pages: '4',
    blurb:
      'Menu that reads on a phone in English and Spanish, plus order links to the two apps they already use.',
  },
  {
    id: 'c2',
    client: 'Amsterdam Ave Barbers',
    category: 'Barbershop',
    neighbourhood: 'Washington Heights',
    borough: 'Manhattan',
    price: '$350',
    days: '1 day',
    pages: '2',
    blurb:
      'Walk-in hours at the top, tap to call, and a map pin that matches the front door.',
  },
  {
    id: 'c3',
    client: 'Throgs Neck Remodeling',
    category: 'Contractor',
    neighbourhood: 'Throgs Neck',
    borough: 'The Bronx',
    price: '$800',
    days: '2 days',
    pages: '8',
    blurb:
      'Before and after photos, license number in the footer, quote form that lands in his inbox.',
  },
  {
    id: 'c4',
    client: 'Delancey Dental',
    category: 'Dentist',
    neighbourhood: 'Lower East Side',
    borough: 'Manhattan',
    price: '$900',
    days: '2 days',
    pages: '10',
    blurb:
      'Insurance list, new-patient forms and directions. Replaced a site nobody had touched in years.',
  },
  {
    id: 'c5',
    client: 'Fifth Ave Nails',
    category: 'Nail salon',
    neighbourhood: 'Park Slope',
    borough: 'Brooklyn',
    price: '$300',
    days: '1 day',
    pages: '2',
    blurb:
      'Service list with prices, a booking link, and a gallery the owner refreshes from her phone.',
  },
  {
    id: 'c6',
    client: 'Roosevelt Ave Laundry',
    category: 'Laundromat',
    neighbourhood: 'Jackson Heights',
    borough: 'Queens',
    price: '$250',
    days: '1 day',
    pages: '1',
    blurb:
      'Hours, pickup radius, price per pound. One page, loads fast standing on the sidewalk.',
  },
  {
    id: 'c7',
    client: 'Steinway Strength',
    category: 'Gym',
    neighbourhood: 'Astoria',
    borough: 'Queens',
    price: '$700',
    days: '2 days',
    pages: '7',
    blurb:
      'Class timetable, trainer pages and a trial-pass form. Front desk edits the schedule itself.',
  },
  {
    id: 'c8',
    client: 'Third Ave Auto Repair',
    category: 'Auto shop',
    neighbourhood: 'Bay Ridge',
    borough: 'Brooklyn',
    price: '$600',
    days: '2 days',
    pages: '5',
    blurb:
      'Services, inspection info, directions, and a phone number that dials in one tap.',
  },
  {
    id: 'c9',
    client: 'Fordham Road Grocery',
    category: 'Bodega',
    neighbourhood: 'Fordham',
    borough: 'The Bronx',
    price: '$200',
    days: '1 day',
    pages: '1',
    blurb:
      'One page: hours, the deli counter, and the corner it sits on. Built from photos sent by text.',
  },
  {
    id: 'c10',
    client: 'Main St Movers',
    category: 'Movers',
    neighbourhood: 'Flushing',
    borough: 'Queens',
    price: '$650',
    days: '2 days',
    pages: '6',
    blurb:
      'Coverage area, flat-rate table, and a quote form that asks the four things needed to price a move.',
  },
  {
    id: 'c11',
    client: 'Bay St Dry Cleaners',
    category: 'Dry cleaner',
    neighbourhood: 'St. George',
    borough: 'Staten Island',
    price: '$400',
    days: '1 day',
    pages: '3',
    blurb:
      'Alteration prices and turnaround times, so the counter stopped answering the same two questions.',
  },
  {
    id: 'c12',
    client: 'Hylan Blvd Tacos',
    category: 'Food truck',
    neighbourhood: 'New Dorp',
    borough: 'Staten Island',
    price: '$500',
    days: '1 day',
    pages: '4',
    blurb:
      'Where the truck parks today, the menu, and a text-to-order link. Updated from the window.',
  },
]

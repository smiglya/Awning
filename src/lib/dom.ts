/**
 * The build prerenders every route in Node, where none of these exist.
 * Anything touched during render — not inside an effect — has to check first.
 */
export const isBrowser = typeof window !== 'undefined'

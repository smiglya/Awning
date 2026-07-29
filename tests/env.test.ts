import { describe, expect, it } from 'vitest'
import { env } from '../src/env'

/**
 * The point of these is not the happy path — it is that a misconfigured
 * deployment fails loudly at load rather than producing `undefined` inside a
 * fetch call three screens later.
 */
describe('environment', () => {
  it('defaults to local-only mode when no base URL is set', () => {
    expect(env.VITE_API_BASE_URL).toBe('')
  })

  it('applies the default timeout', () => {
    expect(env.VITE_API_TIMEOUT_MS).toBe(12_000)
  })

  it('exposes exactly the declared variables', () => {
    expect(Object.keys(env).sort()).toEqual(['VITE_API_BASE_URL', 'VITE_API_TIMEOUT_MS'])
  })
})

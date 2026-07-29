import { describe, expect, it } from 'vitest'
import { buildPath, ENDPOINTS } from '../src/api/endpoints'
import { createLead, listProjects, subscribe } from '../src/api/index'
import { isLive } from '../src/api/config'

describe('endpoint contract', () => {
  it('declares every route the components rely on', () => {
    expect(Object.keys(ENDPOINTS).sort()).toEqual([
      'createLead',
      'getLead',
      'getThread',
      'listProjects',
      'postMessage',
      'subscribe',
    ])
  })

  it('every path is versioned and absolute', () => {
    for (const endpoint of Object.values(ENDPOINTS)) {
      expect(endpoint.path.startsWith('/api/v1/')).toBe(true)
    }
  })
})

describe('buildPath', () => {
  it('substitutes named params', () => {
    expect(buildPath('/api/v1/leads/:ticket', { ticket: 'NYC-1' })).toBe(
      '/api/v1/leads/NYC-1'
    )
  })

  it('encodes values so a stray slash cannot escape the path', () => {
    expect(buildPath('/api/v1/leads/:ticket', { ticket: 'a/b' })).toBe(
      '/api/v1/leads/a%2Fb'
    )
  })

  it('throws rather than silently building /undefined', () => {
    expect(() => buildPath('/api/v1/leads/:ticket', {})).toThrow(/Missing path parameter/)
  })
})

describe('local mode', () => {
  it('is the active mode in tests, since no base URL is configured', () => {
    expect(isLive).toBe(false)
  })

  it('createLead echoes the locally minted ticket back', async () => {
    const lead = await createLead(
      {
        businessName: 'Test Shop',
        businessType: 'Laundromat',
        needType: 'First site for the business',
        contact: 'a@b.co',
      },
      'NYC-260729-ABCD'
    )
    expect(lead.ticket).toBe('NYC-260729-ABCD')
    expect(lead.local).toBe(true)
  })

  it('listProjects serves the sample set and flags it as sample', async () => {
    const result = await listProjects()
    expect(result.sample).toBe(true)
    expect(result.projects.length).toBeGreaterThan(0)
  })

  it('subscribe resolves without a server', async () => {
    await expect(subscribe('owner@example.com')).resolves.toMatchObject({ ok: true })
  })
})

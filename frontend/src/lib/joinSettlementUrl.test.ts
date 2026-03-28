import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildJoinSettlementUrl, getPublicAppUrl } from './joinSettlementUrl'

describe('getPublicAppUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('uses VITE_PUBLIC_APP_URL when set', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://gmtm.app/')
    expect(getPublicAppUrl()).toBe('https://gmtm.app')
  })

  it('falls back to window origin when env is blank', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', '')
    expect(getPublicAppUrl()).toBe(window.location.origin)
  })
})

describe('buildJoinSettlementUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('builds split URL with id', () => {
    vi.stubEnv('VITE_PUBLIC_APP_URL', 'https://example.com')
    expect(buildJoinSettlementUrl('abc-123')).toBe('https://example.com/split/abc-123')
  })
})

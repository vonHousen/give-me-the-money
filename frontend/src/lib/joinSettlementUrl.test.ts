import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildJoinSettlementUrl,
  getPublicAppUrl,
  parseSettlementIdFromJoinPayload,
} from './joinSettlementUrl'

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

describe('parseSettlementIdFromJoinPayload', () => {
  it('accepts bare settlement id', () => {
    expect(parseSettlementIdFromJoinPayload('  abc-123-uuid  ')).toBe('abc-123-uuid')
  })

  it('extracts id from full join URL', () => {
    expect(parseSettlementIdFromJoinPayload('https://gmtm.app/split/550e8400-e29b-41d4-a716-446655440000')).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    )
  })

  it('decodes encoded id segment', () => {
    expect(parseSettlementIdFromJoinPayload('https://x.test/split/foo%2Fbar')).toBe('foo/bar')
  })

  it('returns null for unrelated URLs', () => {
    expect(parseSettlementIdFromJoinPayload('https://evil.com/')).toBeNull()
  })
})

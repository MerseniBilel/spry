import { describe, it, expect } from 'vitest'
import { computeConfigChecksum } from '../../../src/utils/checksum.js'

describe('computeConfigChecksum', () => {
  it('returns a 64-char hex string (sha256)', () => {
    const hash = computeConfigChecksum({
      stateManagement: 'zustand',
      networkLayer: 'fetch',
      queryClient: 'react-query',
      packageManager: 'npm',
    })
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns the same hash for the same input', () => {
    const choices = {
      stateManagement: 'zustand' as const,
      networkLayer: 'fetch' as const,
      queryClient: 'react-query' as const,
      packageManager: 'npm' as const,
    }
    const a = computeConfigChecksum(choices)
    const b = computeConfigChecksum(choices)
    expect(a).toBe(b)
  })

  it('returns different hashes for different input', () => {
    const base = {
      stateManagement: 'zustand' as const,
      queryClient: 'react-query' as const,
      packageManager: 'npm' as const,
    }
    const a = computeConfigChecksum({
      ...base,
      networkLayer: 'fetch',
    })
    const b = computeConfigChecksum({
      ...base,
      networkLayer: 'axios',
    })
    expect(a).not.toBe(b)
  })
})

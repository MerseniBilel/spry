import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ConfigReader } from '../../../src/config/ConfigReader.js'

describe('ConfigReader', () => {
  let tempDir: string
  const reader = new ConfigReader()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns null when .spryrc.json does not exist', async () => {
    const result = await reader.read(tempDir)
    expect(result).toBeNull()
  })

  it('reads and parses .spryrc.json', async () => {
    const config = {
      stateManagement: 'zustand',
      networkLayer: 'fetch',
      queryClient: 'react-query',
      checksum: 'abc123',
    }
    await writeFile(
      join(tempDir, '.spryrc.json'),
      JSON.stringify(config)
    )

    const result = await reader.read(tempDir)
    expect(result).toEqual(config)
  })

  it('returns true from exists() when file is present', async () => {
    await writeFile(join(tempDir, '.spryrc.json'), '{}')
    expect(await reader.exists(tempDir)).toBe(true)
  })

  it('returns false from exists() when file is missing', async () => {
    expect(await reader.exists(tempDir)).toBe(false)
  })
})

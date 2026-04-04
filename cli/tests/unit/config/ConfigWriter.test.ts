import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ConfigWriter } from '../../../src/config/ConfigWriter.js'
import type {
  SpryConfig,
  SpryUserChoices,
} from '../../../src/types/config.js'

describe('ConfigWriter', () => {
  let tempDir: string
  const writer = new ConfigWriter()

  const choices: SpryUserChoices = {
    stateManagement: 'zustand',
    networkLayer: 'fetch',
    queryClient: 'react-query',
    packageManager: 'npm',
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('writes .spryrc.json to the project root', async () => {
    await writer.write(tempDir, choices)
    const raw = await readFile(
      join(tempDir, '.spryrc.json'),
      'utf-8'
    )
    const config: SpryConfig = JSON.parse(raw)

    expect(config.stateManagement).toBe('zustand')
    expect(config.networkLayer).toBe('fetch')
    expect(config.queryClient).toBe('react-query')
    expect(config.packageManager).toBe('npm')
  })

  it('includes a checksum in the written config', async () => {
    await writer.write(tempDir, choices)
    const raw = await readFile(
      join(tempDir, '.spryrc.json'),
      'utf-8'
    )
    const config: SpryConfig = JSON.parse(raw)

    expect(config.checksum).toMatch(/^[a-f0-9]{64}$/)
  })

  it('returns the full config with checksum', async () => {
    const result = await writer.write(tempDir, choices)
    expect(result.checksum).toBeDefined()
    expect(result.networkLayer).toBe('fetch')
  })
})

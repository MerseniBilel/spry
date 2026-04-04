import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ConfigIntegrityChecker } from '../../../src/config/ConfigIntegrityChecker.js'
import { ConfigWriter } from '../../../src/config/ConfigWriter.js'
import { writeFileWithDir } from '../../../src/utils/fs.js'

describe('ConfigIntegrityChecker', () => {
  let tempDir: string
  const checker = new ConfigIntegrityChecker()
  const writer = new ConfigWriter()

  const choices = {
    stateManagement: 'zustand' as const,
    networkLayer: 'fetch' as const,
    queryClient: 'react-query' as const,
    packageManager: 'npm' as const,
  }

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns true for a valid config', async () => {
    await writer.write(tempDir, choices)
    expect(await checker.verify(tempDir)).toBe(true)
  })

  it('returns false when config is tampered', async () => {
    const config = await writer.write(tempDir, choices)
    const tampered = { ...config, networkLayer: 'axios' }
    await writeFileWithDir(
      join(tempDir, '.spryrc.json'),
      JSON.stringify(tampered)
    )
    expect(await checker.verify(tempDir)).toBe(false)
  })

  it('returns false when config does not exist', async () => {
    expect(await checker.verify(tempDir)).toBe(false)
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ManifestReader } from '../../../src/manifest/ManifestReader.js'

describe('ManifestReader', () => {
  let tempDir: string
  const reader = new ManifestReader()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns null when manifest does not exist', async () => {
    const result = await reader.read(tempDir)
    expect(result).toBeNull()
  })

  it('returns false for exists when manifest does not exist', async () => {
    expect(await reader.exists(tempDir)).toBe(false)
  })

  it('reads a valid manifest file', async () => {
    const manifest = {
      features: {
        profile: { generatedMethods: ['getProfile'] },
      },
    }
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify(manifest)
    )

    const result = await reader.read(tempDir)
    expect(result).toEqual(manifest)
  })

  it('returns true for exists when manifest exists', async () => {
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify({ features: {} })
    )
    expect(await reader.exists(tempDir)).toBe(true)
  })

  it('returns true when feature exists in manifest', async () => {
    const manifest = {
      features: {
        profile: { generatedMethods: [] },
      },
    }
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify(manifest)
    )

    expect(await reader.hasFeature(tempDir, 'profile')).toBe(true)
  })

  it('returns false when feature does not exist in manifest', async () => {
    const manifest = {
      features: {
        profile: { generatedMethods: [] },
      },
    }
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify(manifest)
    )

    expect(await reader.hasFeature(tempDir, 'auth')).toBe(false)
  })

  it('returns false for hasFeature when manifest does not exist', async () => {
    expect(await reader.hasFeature(tempDir, 'profile')).toBe(false)
  })
})

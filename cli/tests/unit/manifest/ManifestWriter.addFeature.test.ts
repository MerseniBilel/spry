import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ManifestWriter } from '../../../src/manifest/ManifestWriter.js'
import type { SpryManifest } from '../../../src/types/manifest.js'

describe('ManifestWriter.addFeature', () => {
  let tempDir: string
  const writer = new ManifestWriter()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('creates manifest with feature when no manifest exists', async () => {
    await writer.addFeature(tempDir, 'profile')

    const raw = await readFile(
      join(tempDir, '.spry-manifest.json'),
      'utf-8'
    )
    const manifest: SpryManifest = JSON.parse(raw)
    expect(manifest.features.profile).toEqual({
      generatedMethods: [],
    })
  })

  it('adds feature to existing manifest', async () => {
    await writer.writeEmpty(tempDir)
    await writer.addFeature(tempDir, 'profile')

    const raw = await readFile(
      join(tempDir, '.spry-manifest.json'),
      'utf-8'
    )
    const manifest: SpryManifest = JSON.parse(raw)
    expect(manifest.features.profile).toEqual({
      generatedMethods: [],
    })
  })

  it('preserves existing features when adding a new one', async () => {
    await writer.write(tempDir, {
      features: {
        auth: { generatedMethods: ['login', 'logout'] },
      },
    })

    await writer.addFeature(tempDir, 'profile')

    const raw = await readFile(
      join(tempDir, '.spry-manifest.json'),
      'utf-8'
    )
    const manifest: SpryManifest = JSON.parse(raw)
    expect(manifest.features.auth.generatedMethods).toEqual([
      'login',
      'logout',
    ])
    expect(manifest.features.profile).toEqual({
      generatedMethods: [],
    })
  })

  it('resets generatedMethods when feature already exists', async () => {
    await writer.write(tempDir, {
      features: {
        profile: { generatedMethods: ['getProfile'] },
      },
    })

    await writer.addFeature(tempDir, 'profile')

    const raw = await readFile(
      join(tempDir, '.spry-manifest.json'),
      'utf-8'
    )
    const manifest: SpryManifest = JSON.parse(raw)
    expect(manifest.features.profile.generatedMethods).toEqual([])
  })
})

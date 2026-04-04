import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ManifestWriter } from '../../../src/manifest/ManifestWriter.js'

describe('ManifestWriter', () => {
  let tempDir: string
  const writer = new ManifestWriter()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('writes an empty manifest', async () => {
    await writer.writeEmpty(tempDir)
    const raw = await readFile(
      join(tempDir, '.spry-manifest.json'),
      'utf-8'
    )
    expect(JSON.parse(raw)).toEqual({ features: {} })
  })

  it('writes a manifest with features', async () => {
    await writer.write(tempDir, {
      features: {
        profile: { generatedMethods: ['getProfile'] },
      },
    })

    const raw = await readFile(
      join(tempDir, '.spry-manifest.json'),
      'utf-8'
    )
    const manifest = JSON.parse(raw)
    expect(manifest.features.profile.generatedMethods).toEqual([
      'getProfile',
    ])
  })
})

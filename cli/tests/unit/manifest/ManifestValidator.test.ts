import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ManifestValidator } from '../../../src/manifest/ManifestValidator.js'

describe('ManifestValidator', () => {
  let tempDir: string
  const validator = new ManifestValidator()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('all methods are new when no manifest exists', async () => {
    const diff = await validator.diff(tempDir, 'profile', [
      'getProfile',
      'updateProfile',
    ])

    expect(diff.newMethods).toEqual(['getProfile', 'updateProfile'])
    expect(diff.existingMethods).toEqual([])
  })

  it('all methods are new on first build', async () => {
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify({
        features: { profile: { generatedMethods: [] } },
      })
    )

    const diff = await validator.diff(tempDir, 'profile', [
      'getProfile',
    ])
    expect(diff.newMethods).toEqual(['getProfile'])
    expect(diff.existingMethods).toEqual([])
  })

  it('identifies new vs existing methods', async () => {
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify({
        features: {
          profile: { generatedMethods: ['getProfile'] },
        },
      })
    )

    const diff = await validator.diff(tempDir, 'profile', [
      'getProfile',
      'updateProfile',
      'deleteProfile',
    ])

    expect(diff.existingMethods).toEqual(['getProfile'])
    expect(diff.newMethods).toEqual([
      'updateProfile',
      'deleteProfile',
    ])
  })

  it('all methods existing when nothing new', async () => {
    await writeFile(
      join(tempDir, '.spry-manifest.json'),
      JSON.stringify({
        features: {
          profile: {
            generatedMethods: ['getProfile', 'updateProfile'],
          },
        },
      })
    )

    const diff = await validator.diff(tempDir, 'profile', [
      'getProfile',
      'updateProfile',
    ])

    expect(diff.newMethods).toEqual([])
    expect(diff.existingMethods).toEqual([
      'getProfile',
      'updateProfile',
    ])
  })
})

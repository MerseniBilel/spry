import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FileGenerator } from '../../../src/generator/FileGenerator.js'

describe('FileGenerator', () => {
  let tempDir: string
  const generator = new FileGenerator()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('renders a Mustache template with context variables', async () => {
    const result = await generator.render(
      'feature/repository.abstract.mustache',
      {
        featureName: 'profile',
        FeatureName: 'Profile',
        featureNameKebab: 'profile',
      }
    )

    expect(result).toContain('export abstract class ProfileRepository')
    expect(result).toContain("@BaseURL('/api/v1/profile')")
    expect(result).toContain('spry build profile')
  })

  it('renders model template', async () => {
    const result = await generator.render('feature/model.mustache', {
      featureName: 'profile',
      FeatureName: 'Profile',
      featureNameKebab: 'profile',
    })

    expect(result).toContain('export interface Profile')
  })

  it('renders and writes to disk', async () => {
    const outputPath = join(tempDir, 'TestRepository.ts')

    await generator.renderAndWrite(
      'feature/repository.abstract.mustache',
      outputPath,
      {
        featureName: 'auth',
        FeatureName: 'Auth',
        featureNameKebab: 'auth',
      }
    )

    const content = await readFile(outputPath, 'utf-8')
    expect(content).toContain('export abstract class AuthRepository')
    expect(content).toContain("@BaseURL('/api/v1/auth')")
  })

  it('creates parent directories when writing', async () => {
    const outputPath = join(tempDir, 'deep', 'nested', 'Model.ts')

    await generator.renderAndWrite('feature/model.mustache', outputPath, {
      featureName: 'order',
      FeatureName: 'Order',
      featureNameKebab: 'order',
    })

    const content = await readFile(outputPath, 'utf-8')
    expect(content).toContain('export interface Order')
  })
})

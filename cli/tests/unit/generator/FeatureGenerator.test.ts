import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { FeatureGenerator } from '../../../src/generator/FeatureGenerator.js'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

describe('FeatureGenerator', () => {
  let tempDir: string
  const generator = new FeatureGenerator()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('generates abstract repository file', async () => {
    await generator.generate(tempDir, 'profile')

    const content = await readFile(
      join(
        tempDir,
        'features/profile/domain/repositories/ProfileRepository.ts'
      ),
      'utf-8'
    )
    expect(content).toContain('export abstract class ProfileRepository')
    expect(content).toContain("@BaseURL('/api/v1/profile')")
    expect(content).toContain("import { BaseURL } from '@spry-cli/decorators'")
  })

  it('generates domain model file', async () => {
    await generator.generate(tempDir, 'profile')

    const content = await readFile(
      join(tempDir, 'features/profile/domain/models/Profile.ts'),
      'utf-8'
    )
    expect(content).toContain('export interface Profile')
  })

  it('creates all .gitkeep directories', async () => {
    await generator.generate(tempDir, 'profile')

    const expectedDirs = [
      'presentation/views',
      'presentation/components',
      'presentation/hooks',
      'presentation/state',
      'domain/usecases',
      'domain/errors',
      'data/repositories',
      'data/datasources',
      'data/models',
    ]

    for (const dir of expectedDirs) {
      const gitkeep = join(tempDir, 'features/profile', dir, '.gitkeep')
      expect(await exists(gitkeep)).toBe(true)
    }
  })

  it('returns list of created entries', async () => {
    const created = await generator.generate(tempDir, 'profile')

    expect(created).toContain(
      'domain/repositories/ProfileRepository.ts'
    )
    expect(created).toContain('domain/models/Profile.ts')
    expect(created).toContain('presentation/views')
    expect(created).toContain('data/datasources')
  })

  it('handles kebab-case feature names', async () => {
    await generator.generate(tempDir, 'user-profile')

    const repoContent = await readFile(
      join(
        tempDir,
        'features/user-profile/domain/repositories/UserProfileRepository.ts'
      ),
      'utf-8'
    )
    expect(repoContent).toContain(
      'export abstract class UserProfileRepository'
    )

    const modelContent = await readFile(
      join(
        tempDir,
        'features/user-profile/domain/models/UserProfile.ts'
      ),
      'utf-8'
    )
    expect(modelContent).toContain('export interface UserProfile')
  })

  it('does not create di.ts', async () => {
    await generator.generate(tempDir, 'profile')
    expect(
      await exists(join(tempDir, 'features/profile/di.ts'))
    ).toBe(false)
  })
})

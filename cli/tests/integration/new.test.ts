import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import { mkdtemp, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ConfigWriter } from '../../src/config/ConfigWriter.js'
import { ConfigReader } from '../../src/config/ConfigReader.js'
import { ManifestWriter } from '../../src/manifest/ManifestWriter.js'
import { ManifestReader } from '../../src/manifest/ManifestReader.js'
import { FeatureGenerator } from '../../src/generator/FeatureGenerator.js'
import { getDefaultChoices } from '../../src/prompts/initPrompts.js'
import { validateFeatureName } from '../../src/prompts/newPrompts.js'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

describe('spry new (integration)', () => {
  let projectRoot: string
  let srcRoot: string

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'spry-new-'))
    srcRoot = join(projectRoot, 'src')

    // Simulate a project that has already run spry init
    const configWriter = new ConfigWriter()
    await configWriter.write(projectRoot, getDefaultChoices())

    const manifestWriter = new ManifestWriter()
    await manifestWriter.writeEmpty(projectRoot)
  })

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
  })

  it('creates full feature skeleton for "profile"', async () => {
    const generator = new FeatureGenerator()
    const created = await generator.generate(srcRoot, 'profile')

    // Verify repository file
    const repoPath = join(
      srcRoot,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )
    expect(await exists(repoPath)).toBe(true)
    const repoContent = await readFile(repoPath, 'utf-8')
    expect(repoContent).toContain(
      'export abstract class ProfileRepository'
    )
    expect(repoContent).toContain("@BaseURL('/api/v1/profile')")
    expect(repoContent).toContain(
      "import { BaseURL } from '@spry-cli/decorators'"
    )
    expect(repoContent).toContain('spry build profile')

    // Verify model file
    const modelPath = join(
      srcRoot,
      'features/profile/domain/models/Profile.ts'
    )
    expect(await exists(modelPath)).toBe(true)
    const modelContent = await readFile(modelPath, 'utf-8')
    expect(modelContent).toContain('export interface Profile')

    // Verify all .gitkeep directories
    const gitkeepDirs = [
      'presentation/views',
      'presentation/components',
      'presentation/hooks',
      'presentation/state',
      'domain/usecases',
      'domain/models',
      'data/repositories',
      'data/datasources',
      'data/models',
    ]
    for (const dir of gitkeepDirs) {
      expect(
        await exists(
          join(srcRoot, 'features/profile', dir, '.gitkeep')
        )
      ).toBe(true)
    }

    // Verify di.ts is NOT created
    expect(
      await exists(join(srcRoot, 'features/profile/di.ts'))
    ).toBe(false)

    // Verify created list
    expect(created.length).toBeGreaterThan(0)
    expect(created).toContain(
      'domain/repositories/ProfileRepository.ts'
    )
    expect(created).toContain('domain/models/Profile.ts')
  })

  it('updates manifest with new feature entry', async () => {
    const generator = new FeatureGenerator()
    await generator.generate(srcRoot, 'profile')

    const manifestWriter = new ManifestWriter()
    await manifestWriter.addFeature(projectRoot, 'profile')

    const manifestReader = new ManifestReader()
    const manifest = await manifestReader.read(projectRoot)
    expect(manifest).not.toBeNull()
    expect(manifest!.features.profile).toEqual({
      generatedMethods: [],
    })
  })

  it('detects duplicate feature in manifest', async () => {
    const manifestWriter = new ManifestWriter()
    await manifestWriter.addFeature(projectRoot, 'profile')

    const manifestReader = new ManifestReader()
    expect(
      await manifestReader.hasFeature(projectRoot, 'profile')
    ).toBe(true)
    expect(
      await manifestReader.hasFeature(projectRoot, 'auth')
    ).toBe(false)
  })

  it('rejects invalid feature names', () => {
    expect(validateFeatureName('Profile')).toBeDefined()
    expect(validateFeatureName('')).toBeDefined()
    expect(validateFeatureName('user_profile')).toBeDefined()
    expect(validateFeatureName('profile')).toBeUndefined()
    expect(validateFeatureName('user-profile')).toBeUndefined()
  })

  it('fails without spry init (no config)', async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), 'spry-no-init-'))

    try {
      const configReader = new ConfigReader()
      const config = await configReader.read(emptyDir)
      expect(config).toBeNull()
    } finally {
      await rm(emptyDir, { recursive: true, force: true })
    }
  })

  it('handles kebab-case feature names correctly', async () => {
    const generator = new FeatureGenerator()
    await generator.generate(srcRoot, 'user-profile')

    const repoPath = join(
      srcRoot,
      'features/user-profile/domain/repositories/UserProfileRepository.ts'
    )
    const repoContent = await readFile(repoPath, 'utf-8')
    expect(repoContent).toContain(
      'export abstract class UserProfileRepository'
    )

    const modelPath = join(
      srcRoot,
      'features/user-profile/domain/models/UserProfile.ts'
    )
    const modelContent = await readFile(modelPath, 'utf-8')
    expect(modelContent).toContain('export interface UserProfile')
  })

  it('preserves existing features when adding a second feature', async () => {
    const generator = new FeatureGenerator()
    const manifestWriter = new ManifestWriter()

    // Create first feature
    await generator.generate(srcRoot, 'profile')
    await manifestWriter.addFeature(projectRoot, 'profile')

    // Create second feature
    await generator.generate(srcRoot, 'auth')
    await manifestWriter.addFeature(projectRoot, 'auth')

    // Verify both exist in manifest
    const manifestReader = new ManifestReader()
    const manifest = await manifestReader.read(projectRoot)
    expect(manifest!.features.profile).toBeDefined()
    expect(manifest!.features.auth).toBeDefined()

    // Verify both feature directories exist
    expect(
      await exists(
        join(
          srcRoot,
          'features/profile/domain/repositories/ProfileRepository.ts'
        )
      )
    ).toBe(true)
    expect(
      await exists(
        join(
          srcRoot,
          'features/auth/domain/repositories/AuthRepository.ts'
        )
      )
    ).toBe(true)
  })
})

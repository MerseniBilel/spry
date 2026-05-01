import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import {
  mkdtemp,
  rm,
  readFile,
  access,
  copyFile,
  mkdir,
} from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { ConfigWriter } from '../../src/config/ConfigWriter.js'
import { ManifestWriter } from '../../src/manifest/ManifestWriter.js'
import { ManifestReader } from '../../src/manifest/ManifestReader.js'
import { FeatureGenerator } from '../../src/generator/FeatureGenerator.js'
import { RepositoryParser } from '../../src/parser/RepositoryParser.js'
import { DecoratorReader } from '../../src/parser/DecoratorReader.js'
import { MethodParser } from '../../src/parser/MethodParser.js'
import { NormalizationMapper } from '../../src/parser/NormalizationMapper.js'
import { BuildGenerator } from '../../src/generator/BuildGenerator.js'
import { ManifestValidator } from '../../src/manifest/ManifestValidator.js'
import { getDefaultChoices } from '../../src/prompts/initPrompts.js'
import type { SpryConfig } from '../../src/types/config.js'

const __thisDir = dirname(fileURLToPath(import.meta.url))
const FIXTURES = join(__thisDir, '..', 'fixtures', 'repositories')

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

async function setupProject(): Promise<{
  projectRoot: string
  srcRoot: string
  config: SpryConfig
}> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'spry-build-'))
  const srcRoot = join(projectRoot, 'src')

  const configWriter = new ConfigWriter()
  const config = await configWriter.write(
    projectRoot,
    getDefaultChoices()
  )

  const manifestWriter = new ManifestWriter()
  await manifestWriter.writeEmpty(projectRoot)

  const featureGen = new FeatureGenerator()
  await featureGen.generate(srcRoot, 'profile')
  await manifestWriter.addFeature(projectRoot, 'profile')

  return { projectRoot, srcRoot, config }
}

async function copyFixture(
  fixtureName: string,
  destPath: string
): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true })
  await copyFile(join(FIXTURES, fixtureName), destPath)
}

function parseAndNormalize(repoPath: string, featureName: string) {
  const repoParser = new RepositoryParser()
  const { classDecl } = repoParser.parse(repoPath)
  const decoratorReader = new DecoratorReader()
  const baseUrl = decoratorReader.readBaseUrl(classDecl) ?? ''
  const methodParser = new MethodParser()
  const methods = methodParser.parse(classDecl)
  const mapper = new NormalizationMapper()
  return mapper.normalize({ featureName, baseUrl, methods })
}

describe('spry build (integration)', () => {
  let projectRoot: string
  let srcRoot: string
  let config: SpryConfig

  beforeEach(async () => {
    const setup = await setupProject()
    projectRoot = setup.projectRoot
    srcRoot = setup.srcRoot
    config = setup.config
  })

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
  })

  it('generates all files on first build', async () => {
    const repoPath = join(
      srcRoot,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )
    await copyFixture('ProfileRepository.simple.ts', repoPath)

    const context = parseAndNormalize(repoPath, 'profile')
    const generator = new BuildGenerator()
    const result = await generator.generateAll(
      srcRoot,
      config,
      context
    )

    // Use cases
    expect(
      await exists(
        join(srcRoot, 'features/profile/domain/usecases/GetProfileUseCase.ts')
      )
    ).toBe(true)
    expect(
      await exists(
        join(srcRoot, 'features/profile/domain/usecases/UpdateProfileUseCase.ts')
      )
    ).toBe(true)

    // RepositoryImpl
    const repoImpl = await readFile(
      join(srcRoot, 'features/profile/data/repositories/ProfileRepositoryImpl.ts'),
      'utf-8'
    )
    expect(repoImpl).toContain('class ProfileRepositoryImpl')
    expect(repoImpl).toContain('getProfile')
    expect(repoImpl).toContain('updateProfile')

    // RemoteDataSource — URLs not HTML-encoded, paths interpolated
    const ds = await readFile(
      join(srcRoot, 'features/profile/data/datasources/ProfileRemoteDataSource.ts'),
      'utf-8'
    )
    expect(ds).toContain('class ProfileRemoteDataSource')
    expect(ds).toContain('httpClient.get')
    expect(ds).not.toContain('&#x2F;')
    expect(ds).toContain('${userId}')
    expect(ds).toContain('@shared/http/httpClient')

    // Queries — grouped import, no unused imports
    const queries = await readFile(
      join(srcRoot, 'features/profile/presentation/hooks/profileQueries.ts'),
      'utf-8'
    )
    expect(queries).toContain('useQuery')
    expect(queries).toContain('useMutation')
    expect(queries).toContain('useGetProfile')
    expect(queries).toContain('useUpdateProfile')
    expect(queries).toContain('@features/profile/di')
    // Single grouped import — not multiple lines from same module
    const diImportCount = (queries.match(/@features\/profile\/di/g) ?? []).length
    expect(diImportCount).toBe(1)

    // Store
    expect(
      await exists(
        join(srcRoot, 'features/profile/presentation/state/profileStore.ts')
      )
    ).toBe(true)

    // Screen view
    const screen = await readFile(
      join(srcRoot, 'features/profile/presentation/views/ProfileScreen.tsx'),
      'utf-8'
    )
    expect(screen).toContain('ProfileScreen')
    expect(screen).toContain('react-native')

    // DI
    const di = await readFile(
      join(srcRoot, 'features/profile/di.ts'),
      'utf-8'
    )
    expect(di).toContain('getProfileUseCase')
    expect(di).toContain('updateProfileUseCase')
    expect(di).toContain('ProfileRemoteDataSource')
    expect(di).toContain('ProfileRepositoryImpl')

    // Use case uses @features alias
    const usecase = await readFile(
      join(srcRoot, 'features/profile/domain/usecases/GetProfileUseCase.ts'),
      'utf-8'
    )
    expect(usecase).toContain('@features/profile/domain/repositories')
    expect(usecase).not.toContain('../models')

    expect(result.created.length).toBeGreaterThan(0)
  })

  it('skips store on second generateAll (developer-owned)', async () => {
    const repoPath = join(
      srcRoot,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )
    await copyFixture('ProfileRepository.simple.ts', repoPath)

    const context = parseAndNormalize(repoPath, 'profile')
    const generator = new BuildGenerator()

    await generator.generateAll(srcRoot, config, context)

    const result = await generator.generateAll(srcRoot, config, context)
    expect(result.skipped.some((s) => s.includes('profileStore.ts'))).toBe(true)
  })

  it('injects new methods without touching existing files structure', async () => {
    const repoPath = join(
      srcRoot,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )

    // First build with simple repo (2 methods)
    await copyFixture('ProfileRepository.simple.ts', repoPath)
    const ctx1 = parseAndNormalize(repoPath, 'profile')
    const generator = new BuildGenerator()
    await generator.generateAll(srcRoot, config, ctx1)

    // Update manifest
    const manifestWriter = new ManifestWriter()
    const manifest = (await new ManifestReader().read(projectRoot))!
    manifest.features.profile = {
      generatedMethods: ['getProfile', 'updateProfile'],
    }
    await manifestWriter.write(projectRoot, manifest)

    // Replace with complex repo (4 methods)
    await copyFixture('ProfileRepository.complex.ts', repoPath)
    const ctx2 = parseAndNormalize(repoPath, 'profile')

    const validator = new ManifestValidator()
    const diff = await validator.diff(projectRoot, 'profile', [
      'getProfile',
      'createProfile',
      'updateProfile',
      'deleteProfile',
    ])

    expect(diff.newMethods).toEqual(['createProfile', 'deleteProfile'])

    const newMethods = ctx2.allMethods.filter((m) =>
      diff.newMethods.includes(m.name)
    )

    const result = await generator.injectMethods({
      srcRoot,
      config,
      context: ctx2,
      newMethods,
    })

    expect(
      await exists(
        join(srcRoot, 'features/profile/domain/usecases/CreateProfileUseCase.ts')
      )
    ).toBe(true)
    expect(
      await exists(
        join(srcRoot, 'features/profile/domain/usecases/DeleteProfileUseCase.ts')
      )
    ).toBe(true)

    expect(result.injected.length).toBeGreaterThan(0)
    expect(result.skipped.some((s) => s.includes('Store'))).toBe(true)
  })

  it('handles complex repository with all HTTP verbs', async () => {
    const repoPath = join(
      srcRoot,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )
    await copyFixture('ProfileRepository.complex.ts', repoPath)

    const context = parseAndNormalize(repoPath, 'profile')

    expect(context.queries).toHaveLength(1)
    expect(context.mutations).toHaveLength(3)
    expect(context.allMethods).toHaveLength(4)

    const generator = new BuildGenerator()
    const result = await generator.generateAll(srcRoot, config, context)

    expect(result.created.length).toBeGreaterThanOrEqual(9)
  })

  it('generates Atoms.ts for Jotai-configured projects', async () => {
    // Override the default Zustand setup with a Jotai config.
    const jotaiRoot = await mkdtemp(join(tmpdir(), 'spry-jotai-'))
    const jotaiSrc = join(jotaiRoot, 'src')
    const configWriter = new ConfigWriter()
    const jotaiConfig = await configWriter.write(jotaiRoot, {
      ...getDefaultChoices(),
      stateManagement: 'jotai',
    })
    const manifestWriter = new ManifestWriter()
    await manifestWriter.writeEmpty(jotaiRoot)
    const featureGen = new FeatureGenerator()
    await featureGen.generate(jotaiSrc, 'profile')
    await manifestWriter.addFeature(jotaiRoot, 'profile')

    const repoPath = join(
      jotaiSrc,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )
    await copyFixture('ProfileRepository.simple.ts', repoPath)

    const context = parseAndNormalize(repoPath, 'profile')
    const generator = new BuildGenerator()
    await generator.generateAll(jotaiSrc, jotaiConfig, context)

    // Atoms.ts is generated, Store.ts is NOT
    expect(
      await exists(
        join(jotaiSrc, 'features/profile/presentation/state/profileAtoms.ts')
      )
    ).toBe(true)
    expect(
      await exists(
        join(jotaiSrc, 'features/profile/presentation/state/profileStore.ts')
      )
    ).toBe(false)

    // Atoms file imports from jotai, not zustand
    const atoms = await readFile(
      join(jotaiSrc, 'features/profile/presentation/state/profileAtoms.ts'),
      'utf-8'
    )
    expect(atoms).toContain("from 'jotai'")
    expect(atoms).toContain('atom<')
    expect(atoms).not.toContain('zustand')

    // Second build skips the atoms file (developer-owned)
    const result2 = await generator.generateAll(
      jotaiSrc,
      jotaiConfig,
      context
    )
    expect(
      result2.skipped.some((s) => s.includes('profileAtoms.ts'))
    ).toBe(true)

    await rm(jotaiRoot, { recursive: true, force: true })
  })

  it('generates correct datasource for fetch config', async () => {
    const repoPath = join(
      srcRoot,
      'features/profile/domain/repositories/ProfileRepository.ts'
    )
    await copyFixture('ProfileRepository.simple.ts', repoPath)

    const context = parseAndNormalize(repoPath, 'profile')
    const generator = new BuildGenerator()
    await generator.generateAll(srcRoot, config, context)

    const ds = await readFile(
      join(srcRoot, 'features/profile/data/datasources/ProfileRemoteDataSource.ts'),
      'utf-8'
    )
    expect(ds).toContain('httpClient.get')
    expect(ds).not.toContain('const { data }')
  })
})

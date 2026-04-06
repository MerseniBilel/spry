import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from 'vitest'
import { mkdtemp, rm, readFile, writeFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ConfigWriter } from '../../src/config/ConfigWriter.js'
import { ConfigReader } from '../../src/config/ConfigReader.js'
import { ConfigIntegrityChecker } from '../../src/config/ConfigIntegrityChecker.js'
import { ManifestWriter } from '../../src/manifest/ManifestWriter.js'
import { ScaffoldGenerator } from '../../src/generator/ScaffoldGenerator.js'
import { patchTsConfig } from '../../src/utils/tsconfig.js'
import { getDefaultChoices } from '../../src/prompts/initPrompts.js'
import type { SpryConfig } from '../../src/types/config.js'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

describe('spry init (integration)', () => {
  let projectRoot: string

  beforeEach(async () => {
    projectRoot = await mkdtemp(join(tmpdir(), 'spry-init-'))

    // Simulate a project with tsconfig.json (as create-expo-app would)
    await writeFile(
      join(projectRoot, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    )
    await writeFile(
      join(projectRoot, 'package.json'),
      JSON.stringify({ name: 'test-app', dependencies: {} })
    )
  })

  afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
  })

  it('runs the full init pipeline with fetch defaults', async () => {
    const choices = getDefaultChoices()

    // 1. Write config
    const configWriter = new ConfigWriter()
    const config = await configWriter.write(projectRoot, choices)

    // 2. Verify config was written correctly
    const configReader = new ConfigReader()
    const readConfig = await configReader.read(projectRoot)
    expect(readConfig).not.toBeNull()
    expect(readConfig?.stateManagement).toBe('zustand')
    expect(readConfig?.networkLayer).toBe('fetch')
    expect(readConfig?.queryClient).toBe('react-query')
    expect(readConfig?.packageManager).toBe('npm')
    expect(readConfig?.checksum).toBe(config.checksum)

    // 3. Verify integrity check passes
    const checker = new ConfigIntegrityChecker()
    expect(await checker.verify(projectRoot)).toBe(true)

    // 4. Write empty manifest
    const manifestWriter = new ManifestWriter()
    await manifestWriter.writeEmpty(projectRoot)
    const manifestRaw = await readFile(
      join(projectRoot, '.spry-manifest.json'),
      'utf-8'
    )
    expect(JSON.parse(manifestRaw)).toEqual({ features: {} })

    // 5. Patch tsconfig
    const patched = await patchTsConfig(projectRoot)
    expect(patched).toBe(true)
    const tsRaw = await readFile(
      join(projectRoot, 'tsconfig.json'),
      'utf-8'
    )
    const tsConfig = JSON.parse(tsRaw)
    expect(tsConfig.compilerOptions.experimentalDecorators).toBe(true)
    expect(tsConfig.compilerOptions.strict).toBe(true)

    // 6. Generate scaffold
    const srcRoot = join(projectRoot, 'src')
    const scaffold = new ScaffoldGenerator()
    const created = await scaffold.generate(srcRoot, 'fetch')
    expect(created.length).toBeGreaterThan(0)

    // Verify error files
    expect(
      await exists(join(srcRoot, 'shared/errors/DomainError.ts'))
    ).toBe(true)
    expect(
      await exists(join(srcRoot, 'shared/errors/HttpError.ts'))
    ).toBe(true)
    expect(
      await exists(join(srcRoot, 'shared/errors/NetworkError.ts'))
    ).toBe(true)
    expect(
      await exists(join(srcRoot, 'shared/errors/index.ts'))
    ).toBe(true)

    // Verify fetch httpClient
    const httpClient = await readFile(
      join(srcRoot, 'shared/http/httpClient.ts'),
      'utf-8'
    )
    expect(httpClient).toContain('await fetch(')

    // Verify scaffold dirs
    const dirs = [
      'shared/components',
      'shared/hooks',
      'shared/utils',
      'shared/constants',
      'shared/types',
    ]
    for (const dir of dirs) {
      expect(
        await exists(join(srcRoot, dir, '.gitkeep'))
      ).toBe(true)
    }
  })

  it('runs the full init pipeline with axios', async () => {
    const choices = {
      ...getDefaultChoices(),
      networkLayer: 'axios' as const,
    }

    const configWriter = new ConfigWriter()
    await configWriter.write(projectRoot, choices)

    const srcRoot = join(projectRoot, 'src')
    const scaffold = new ScaffoldGenerator()
    await scaffold.generate(srcRoot, 'axios')

    const httpClient = await readFile(
      join(srcRoot, 'shared/http/httpClient.ts'),
      'utf-8'
    )
    expect(httpClient).toContain('axios')
    expect(httpClient).not.toContain('await fetch(')
  })

  it('detects tampered config after init', async () => {
    const choices = getDefaultChoices()

    const configWriter = new ConfigWriter()
    const config = await configWriter.write(projectRoot, choices)

    // Tamper with the config
    const tampered: SpryConfig = {
      ...config,
      networkLayer: 'axios',
    }
    await writeFile(
      join(projectRoot, '.spryrc.json'),
      JSON.stringify(tampered)
    )

    const checker = new ConfigIntegrityChecker()
    expect(await checker.verify(projectRoot)).toBe(false)
  })
})

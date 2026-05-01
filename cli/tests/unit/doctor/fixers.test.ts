import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeFileWithDir, fileExists, readFileContent } from '../../../src/utils/fs.js'
import { ConfigWriter } from '../../../src/config/ConfigWriter.js'
import { ConfigIntegrityChecker } from '../../../src/config/ConfigIntegrityChecker.js'
import { getDefaultChoices } from '../../../src/prompts/initPrompts.js'
import {
  fixConfigChecksum,
  fixManifestMissing,
  fixTsConfig,
  fixEslintConfig,
  fixSharedScaffold,
  fixMissingDeps,
  applyFixes,
} from '../../../src/doctor/fixers.js'
import type { CheckResult, FixContext } from '../../../src/doctor/types.js'
import type { SpryConfig } from '../../../src/types/config.js'

const installSpy = vi.fn()
vi.mock('node:child_process', () => ({
  execSync: (...args: unknown[]) => installSpy(...args),
}))

function ctx(
  projectRoot: string,
  overrides: Partial<FixContext> = {}
): FixContext {
  return {
    projectRoot,
    config: null,
    dryRun: false,
    ...overrides,
  }
}

const validConfig: SpryConfig = {
  stateManagement: 'zustand',
  networkLayer: 'fetch',
  queryClient: 'react-query',
  packageManager: 'npm',
  checksum: '',
}

describe('doctor/fixers', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-fixers-'))
    installSpy.mockReset()
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  // ─── fixConfigChecksum ────────────────────────────────────────────

  describe('fixConfigChecksum', () => {
    it('rewrites config so integrity checker passes', async () => {
      await writeFileWithDir(
        join(tempDir, '.spryrc.json'),
        JSON.stringify({
          stateManagement: 'zustand',
          networkLayer: 'fetch',
          queryClient: 'react-query',
          packageManager: 'npm',
          checksum: 'wrong-checksum',
        })
      )

      const outcome = await fixConfigChecksum(ctx(tempDir))
      expect(outcome.applied).toBe(true)
      expect(outcome.kind).toBe('config-checksum')

      const checker = new ConfigIntegrityChecker()
      expect(await checker.verify(tempDir)).toBe(true)
    })

    it('returns non-applied outcome when config missing', async () => {
      const outcome = await fixConfigChecksum(ctx(tempDir))
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('not found')
    })

    it('skips writing when dry-run', async () => {
      await writeFileWithDir(
        join(tempDir, '.spryrc.json'),
        JSON.stringify({
          stateManagement: 'zustand',
          networkLayer: 'fetch',
          queryClient: 'react-query',
          packageManager: 'npm',
          checksum: 'wrong-checksum',
        })
      )
      const before = await readFileContent(join(tempDir, '.spryrc.json'))
      const outcome = await fixConfigChecksum(ctx(tempDir, { dryRun: true }))
      const after = await readFileContent(join(tempDir, '.spryrc.json'))
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('[dry-run]')
      expect(after).toBe(before)
    })
  })

  // ─── fixManifestMissing ───────────────────────────────────────────

  describe('fixManifestMissing', () => {
    it('creates an empty manifest', async () => {
      const outcome = await fixManifestMissing(ctx(tempDir))
      expect(outcome.applied).toBe(true)
      expect(await fileExists(join(tempDir, '.spry-manifest.json'))).toBe(true)
      const content = JSON.parse(
        await readFileContent(join(tempDir, '.spry-manifest.json'))
      )
      expect(content).toEqual({ features: {} })
    })

    it('does not write in dry-run mode', async () => {
      const outcome = await fixManifestMissing(ctx(tempDir, { dryRun: true }))
      expect(outcome.applied).toBe(false)
      expect(await fileExists(join(tempDir, '.spry-manifest.json'))).toBe(false)
    })
  })

  // ─── fixTsConfig ──────────────────────────────────────────────────

  describe('fixTsConfig', () => {
    it('adds experimentalDecorators and path aliases', async () => {
      await writeFileWithDir(
        join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      )
      const outcome = await fixTsConfig(ctx(tempDir))
      expect(outcome.applied).toBe(true)
      const patched = JSON.parse(
        await readFileContent(join(tempDir, 'tsconfig.json'))
      )
      expect(patched.compilerOptions.experimentalDecorators).toBe(true)
      expect(patched.compilerOptions.paths['@features/*']).toEqual([
        './src/features/*',
      ])
      expect(patched.compilerOptions.paths['@shared/*']).toEqual([
        './src/shared/*',
      ])
    })

    it('is idempotent on already-correct tsconfig', async () => {
      await writeFileWithDir(
        join(tempDir, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            experimentalDecorators: true,
            paths: {
              '@features/*': ['./src/features/*'],
              '@shared/*': ['./src/shared/*'],
            },
          },
        })
      )
      await fixTsConfig(ctx(tempDir))
      const result = JSON.parse(
        await readFileContent(join(tempDir, 'tsconfig.json'))
      )
      expect(result.compilerOptions.experimentalDecorators).toBe(true)
      expect(result.compilerOptions.paths['@features/*']).toEqual([
        './src/features/*',
      ])
    })

    it('returns non-applied when tsconfig missing', async () => {
      const outcome = await fixTsConfig(ctx(tempDir))
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('not found')
    })
  })

  // ─── fixEslintConfig ──────────────────────────────────────────────

  describe('fixEslintConfig', () => {
    it('patches a minimal flat config', async () => {
      const initial = `import { defineConfig } from 'eslint/config';
export default defineConfig([
  { ignores: ['node_modules'] }
]);
`
      await writeFile(join(tempDir, 'eslint.config.js'), initial)
      const outcome = await fixEslintConfig(ctx(tempDir))
      expect(outcome.applied).toBe(true)
      const after = await readFileContent(join(tempDir, 'eslint.config.js'))
      expect(after).toContain('domain/repositories/*.ts')
      expect(after).toContain('import/namespace')
    })

    it('is idempotent on second run', async () => {
      const initial = `import { defineConfig } from 'eslint/config';
export default defineConfig([
  { ignores: ['node_modules'] }
]);
`
      await writeFile(join(tempDir, 'eslint.config.js'), initial)
      await fixEslintConfig(ctx(tempDir))
      const afterFirst = await readFileContent(join(tempDir, 'eslint.config.js'))
      await fixEslintConfig(ctx(tempDir))
      const afterSecond = await readFileContent(join(tempDir, 'eslint.config.js'))
      expect(afterSecond).toBe(afterFirst)
    })

    it('returns non-applied when eslint config missing', async () => {
      const outcome = await fixEslintConfig(ctx(tempDir))
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('not found')
    })
  })

  // ─── fixSharedScaffold ────────────────────────────────────────────

  describe('fixSharedScaffold', () => {
    it('regenerates only the missing files (does not touch existing)', async () => {
      const httpPath = join(tempDir, 'src/shared/http/httpClient.ts')
      await writeFileWithDir(httpPath, '// custom user content')
      const before = await readFileContent(httpPath)

      const outcome = await fixSharedScaffold(
        ctx(tempDir, { config: validConfig }),
        ['shared/errors/DomainError.ts']
      )

      expect(outcome.applied).toBe(true)
      expect(
        await fileExists(
          join(tempDir, 'src/shared/errors/DomainError.ts')
        )
      ).toBe(true)
      const after = await readFileContent(httpPath)
      expect(after).toBe(before)
    })

    it('returns non-applied when config is null', async () => {
      const outcome = await fixSharedScaffold(ctx(tempDir), [
        'shared/errors/DomainError.ts',
      ])
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('.spryrc.json missing')
    })

    it('skips files that exist at write time even if listed as missing', async () => {
      // Simulate a stale `targets` list: caller asked us to write a file,
      // but the file actually exists on disk. Must not overwrite.
      const errorsPath = join(tempDir, 'src/shared/errors/DomainError.ts')
      await writeFileWithDir(errorsPath, '// pre-existing user content')
      const before = await readFileContent(errorsPath)

      const outcome = await fixSharedScaffold(
        ctx(tempDir, { config: validConfig }),
        ['shared/errors/DomainError.ts']
      )

      // No real write happened, so applied is false.
      expect(outcome.applied).toBe(false)
      const after = await readFileContent(errorsPath)
      expect(after).toBe(before)
    })

    it('does not write in dry-run mode', async () => {
      const outcome = await fixSharedScaffold(
        ctx(tempDir, { config: validConfig, dryRun: true }),
        ['shared/errors/DomainError.ts']
      )
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('[dry-run]')
      expect(
        await fileExists(
          join(tempDir, 'src/shared/errors/DomainError.ts')
        )
      ).toBe(false)
    })
  })

  // ─── fixMissingDeps ───────────────────────────────────────────────

  describe('fixMissingDeps', () => {
    it('builds correct command for npm', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      )
      const outcome = await fixMissingDeps(
        ctx(tempDir, { config: { ...validConfig, packageManager: 'npm' } }),
        ['zustand']
      )
      expect(outcome.applied).toBe(true)
      expect(installSpy).toHaveBeenCalledWith(
        'npm install zustand',
        expect.objectContaining({ cwd: tempDir })
      )
    })

    it('builds correct command for pnpm', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      )
      await fixMissingDeps(
        ctx(tempDir, { config: { ...validConfig, packageManager: 'pnpm' } }),
        ['zustand', '@tanstack/react-query']
      )
      expect(installSpy).toHaveBeenCalledWith(
        'pnpm add zustand @tanstack/react-query',
        expect.objectContaining({ cwd: tempDir })
      )
    })

    it('does not invoke installer in dry-run mode', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      )
      const outcome = await fixMissingDeps(
        ctx(tempDir, { config: validConfig, dryRun: true }),
        ['zustand']
      )
      expect(outcome.applied).toBe(false)
      expect(outcome.detail).toContain('[dry-run]')
      expect(installSpy).not.toHaveBeenCalled()
    })

    it('reports failure when execSync throws', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({ dependencies: {} })
      )
      installSpy.mockImplementationOnce(() => {
        throw new Error('network down')
      })
      const outcome = await fixMissingDeps(
        ctx(tempDir, { config: validConfig }),
        ['zustand']
      )
      expect(outcome.applied).toBe(false)
      expect(outcome.error).toContain('network down')
    })
  })

  // ─── applyFixes orchestration ─────────────────────────────────────

  describe('applyFixes', () => {
    it('runs config-checksum first so later fixers see fresh config', async () => {
      // Tampered config: tampered checksum + axios networkLayer
      await writeFileWithDir(
        join(tempDir, '.spryrc.json'),
        JSON.stringify({
          stateManagement: 'zustand',
          networkLayer: 'axios',
          queryClient: 'react-query',
          packageManager: 'npm',
          checksum: 'wrong',
        })
      )

      // Stale ctx.config is null — applyFixes should re-read after checksum fix.
      const fixCtx: FixContext = {
        projectRoot: tempDir,
        config: null,
        dryRun: false,
      }

      const results: CheckResult[] = [
        {
          label: '.spryrc.json integrity',
          status: 'fail',
          kind: 'config-checksum',
        },
        {
          label: 'Shared scaffold',
          status: 'fail',
          kind: 'shared-scaffold',
          context: { missingScaffold: ['shared/http/httpClient.ts'] },
        },
      ]

      const outcomes = await applyFixes(fixCtx, results)

      expect(outcomes[0].kind).toBe('config-checksum')
      expect(outcomes[0].applied).toBe(true)
      expect(outcomes[1].kind).toBe('shared-scaffold')
      expect(outcomes[1].applied).toBe(true)

      // Verify scaffold rendered with axios template (proves fresh config was used).
      const httpClient = await readFileContent(
        join(tempDir, 'src/shared/http/httpClient.ts')
      )
      expect(httpClient).toContain('axios')
    })

    it('dry-run mode applies no changes anywhere', async () => {
      await writeFileWithDir(
        join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      )
      const writer = new ConfigWriter()
      await writer.write(tempDir, getDefaultChoices())

      const beforeStat = await stat(join(tempDir, 'tsconfig.json'))

      const results: CheckResult[] = [
        {
          label: 'tsconfig.json decorators',
          status: 'fail',
          kind: 'tsconfig-decorators',
        },
        {
          label: '.spry-manifest.json',
          status: 'fail',
          kind: 'manifest-missing',
        },
      ]

      const outcomes = await applyFixes(
        { projectRoot: tempDir, config: null, dryRun: true },
        results
      )

      expect(outcomes.every((o) => !o.applied)).toBe(true)
      expect(
        await fileExists(join(tempDir, '.spry-manifest.json'))
      ).toBe(false)
      const afterStat = await stat(join(tempDir, 'tsconfig.json'))
      expect(afterStat.mtimeMs).toBe(beforeStat.mtimeMs)
    })

    it('emits unfixable outcome with manual instruction when only config missing', async () => {
      const results: CheckResult[] = [
        { label: '.spryrc.json', status: 'fail', kind: 'config-missing' },
      ]
      const outcomes = await applyFixes(
        { projectRoot: tempDir, config: null, dryRun: false },
        results
      )
      expect(outcomes).toHaveLength(1)
      expect(outcomes[0].applied).toBe(false)
      expect(outcomes[0].detail).toContain('spry init')
    })

    it('substitutes feature name in unfixable feature outcomes', async () => {
      const results: CheckResult[] = [
        {
          label: 'Repository contract',
          status: 'fail',
          kind: 'feature-contract',
          context: { featureName: 'profile' },
        },
      ]
      const outcomes = await applyFixes(
        { projectRoot: tempDir, config: null, dryRun: false },
        results
      )
      expect(outcomes[0].detail).toContain('profile')
    })

    it('returns empty when nothing to fix', async () => {
      const outcomes = await applyFixes(
        { projectRoot: tempDir, config: null, dryRun: false },
        [{ label: 'foo', status: 'pass' }]
      )
      expect(outcomes).toEqual([])
    })

    it('dedupes tsconfig-decorators and tsconfig-aliases into one fix', async () => {
      await writeFileWithDir(
        join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: {} })
      )
      const results: CheckResult[] = [
        {
          label: 'tsconfig.json decorators',
          status: 'fail',
          kind: 'tsconfig-decorators',
        },
        {
          label: 'tsconfig.json path aliases',
          status: 'fail',
          kind: 'tsconfig-aliases',
        },
      ]
      const outcomes = await applyFixes(
        { projectRoot: tempDir, config: null, dryRun: false },
        results
      )
      const tsOutcomes = outcomes.filter(
        (o) => o.kind === 'tsconfig-decorators'
      )
      expect(tsOutcomes).toHaveLength(1)
      expect(tsOutcomes[0].applied).toBe(true)
    })
  })
})

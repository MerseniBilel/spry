import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { writeFileWithDir } from '../../../src/utils/fs.js'
import { ConfigWriter } from '../../../src/config/ConfigWriter.js'
import { ManifestWriter } from '../../../src/manifest/ManifestWriter.js'
import { getDefaultChoices } from '../../../src/prompts/initPrompts.js'
import {
  checkConfig,
  checkManifest,
  checkTsConfig,
  checkDependencies,
  checkSharedScaffold,
  checkEslintConfig,
  checkFeature,
} from '../../../src/commands/doctor.js'

describe('spry doctor', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-doctor-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  // ─── Config ──────────────────────────────────────────────────────

  describe('checkConfig', () => {
    it('fails when .spryrc.json missing', async () => {
      const results = await checkConfig(tempDir)
      expect(results[0].status).toBe('fail')
      expect(results[0].label).toBe('.spryrc.json')
    })

    it('fails when checksum is tampered', async () => {
      await writeFileWithDir(
        join(tempDir, '.spryrc.json'),
        JSON.stringify({
          stateManagement: 'zustand',
          networkLayer: 'fetch',
          queryClient: 'react-query',
          packageManager: 'npm',
          checksum: 'wrong',
        })
      )
      const results = await checkConfig(tempDir)
      expect(results[0].status).toBe('pass')
      expect(results[1].status).toBe('fail')
      expect(results[1].label).toContain('integrity')
    })

    it('passes when config is valid', async () => {
      const writer = new ConfigWriter()
      await writer.write(tempDir, getDefaultChoices())
      const results = await checkConfig(tempDir)
      expect(results.every((r) => r.status === 'pass')).toBe(true)
    })
  })

  // ─── Manifest ────────────────────────────────────────────────────

  describe('checkManifest', () => {
    it('fails when manifest missing', async () => {
      const results = await checkManifest(tempDir)
      expect(results[0].status).toBe('fail')
    })

    it('passes when manifest exists', async () => {
      const writer = new ManifestWriter()
      await writer.writeEmpty(tempDir)
      const results = await checkManifest(tempDir)
      expect(results[0].status).toBe('pass')
    })
  })

  // ─── tsconfig ────────────────────────────────────────────────────

  describe('checkTsConfig', () => {
    it('fails when tsconfig missing', async () => {
      const results = await checkTsConfig(tempDir)
      expect(results[0].status).toBe('fail')
    })

    it('fails when decorators not enabled', async () => {
      await writeFileWithDir(
        join(tempDir, 'tsconfig.json'),
        JSON.stringify({ compilerOptions: { strict: true } })
      )
      const results = await checkTsConfig(tempDir)
      expect(results[0].status).toBe('fail')
      expect(results[0].label).toContain('decorators')
    })

    it('passes when fully configured', async () => {
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
      const results = await checkTsConfig(tempDir)
      expect(results.every((r) => r.status === 'pass')).toBe(true)
    })
  })

  // ─── Dependencies ────────────────────────────────────────────────

  describe('checkDependencies', () => {
    it('passes when all deps present', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@spry-cli/decorators': '0.0.1',
            '@tanstack/react-query': '5.0.0',
            zustand: '5.0.0',
          },
        })
      )
      const results = await checkDependencies(tempDir, null)
      expect(results[0].status).toBe('pass')
    })

    it('warns when deps missing', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@spry-cli/decorators': '0.0.1',
          },
        })
      )
      const results = await checkDependencies(tempDir, null)
      expect(results[0].status).toBe('warn')
      expect(results[0].message).toContain('react-query')
      expect(results[0].message).toContain('zustand')
    })

    it('checks for axios when config says axios', async () => {
      await writeFileWithDir(
        join(tempDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@spry-cli/decorators': '0.0.1',
            '@tanstack/react-query': '5.0.0',
            zustand: '5.0.0',
          },
        })
      )
      const config = {
        stateManagement: 'zustand' as const,
        networkLayer: 'axios' as const,
        queryClient: 'react-query' as const,
        packageManager: 'npm' as const,
        checksum: '',
      }
      const results = await checkDependencies(tempDir, config)
      expect(results[0].status).toBe('warn')
      expect(results[0].message).toContain('axios')
    })
  })

  // ─── Shared scaffold ─────────────────────────────────────────────

  describe('checkSharedScaffold', () => {
    it('fails when scaffold missing', async () => {
      const results = await checkSharedScaffold(tempDir)
      expect(results[0].status).toBe('fail')
    })

    it('passes when scaffold exists', async () => {
      await writeFileWithDir(
        join(tempDir, 'src', 'shared', 'errors', 'DomainError.ts'),
        'export class DomainError {}'
      )
      await writeFileWithDir(
        join(tempDir, 'src', 'shared', 'http', 'httpClient.ts'),
        'export const httpClient = {}'
      )
      const results = await checkSharedScaffold(tempDir)
      expect(results[0].status).toBe('pass')
    })
  })

  // ─── ESLint config ───────────────────────────────────────────────

  describe('checkEslintConfig', () => {
    it('warns when eslint config missing', async () => {
      const results = await checkEslintConfig(tempDir)
      expect(results[0].status).toBe('warn')
    })

    it('passes when resolver configured', async () => {
      await writeFileWithDir(
        join(tempDir, 'eslint.config.js'),
        "{ 'import/resolver': { typescript: true } }"
      )
      const results = await checkEslintConfig(tempDir)
      expect(results[0].status).toBe('pass')
    })
  })

  // ─── Feature checks ─────────────────────────────────────────────

  describe('checkFeature', () => {
    it('fails when contract missing', async () => {
      const results = await checkFeature(tempDir, 'user', [])
      expect(results[0].status).toBe('fail')
      expect(results[0].label).toContain('contract')
    })

    it('fails when generated files missing', async () => {
      await writeFileWithDir(
        join(
          tempDir,
          'src/features/user/domain/repositories/UserRepository.ts'
        ),
        'export abstract class UserRepository {}'
      )
      const results = await checkFeature(tempDir, 'user', [])
      const genCheck = results.find((r) =>
        r.label.includes('Generated')
      )
      expect(genCheck?.status).toBe('fail')
    })

    it('detects drift when contract has new methods', async () => {
      // Write a contract with a decorated method
      await writeFileWithDir(
        join(
          tempDir,
          'src/features/user/domain/repositories/UserRepository.ts'
        ),
        [
          "import { GET, Param, BaseURL } from '@spry-cli/decorators'",
          '@BaseURL("")',
          'export abstract class UserRepository {',
          '  @GET("/users/:id")',
          '  getUser(@Param("id") id: string): Promise<any> { throw new Error("contract") }',
          '}',
        ].join('\n')
      )
      // Manifest says no methods generated yet
      const results = await checkFeature(
        tempDir,
        'user',
        []
      )
      const syncCheck = results.find((r) =>
        r.label.includes('sync')
      )
      expect(syncCheck?.status).toBe('warn')
      expect(syncCheck?.message).toContain('getUser')
    })
  })
})

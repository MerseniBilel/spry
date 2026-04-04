import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
} from 'vitest'
import { execSync } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PackageInstaller } from '../../../src/installer/PackageInstaller.js'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

const mockedExecSync = vi.mocked(execSync)

describe('PackageInstaller', () => {
  const installer = new PackageInstaller()

  beforeEach(() => {
    mockedExecSync.mockReset()
  })

  describe('detect', () => {
    let tempDir: string

    beforeEach(async () => {
      tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
    })

    afterEach(async () => {
      await rm(tempDir, { recursive: true, force: true })
    })

    it('detects bun from bun.lockb', async () => {
      await writeFile(join(tempDir, 'bun.lockb'), '')
      expect(await installer.detect(tempDir)).toBe('bun')
    })

    it('detects bun from bun.lock', async () => {
      await writeFile(join(tempDir, 'bun.lock'), '')
      expect(await installer.detect(tempDir)).toBe('bun')
    })

    it('detects pnpm from pnpm-lock.yaml', async () => {
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '')
      expect(await installer.detect(tempDir)).toBe('pnpm')
    })

    it('detects yarn from yarn.lock', async () => {
      await writeFile(join(tempDir, 'yarn.lock'), '')
      expect(await installer.detect(tempDir)).toBe('yarn')
    })

    it('detects npm from package-lock.json', async () => {
      await writeFile(join(tempDir, 'package-lock.json'), '')
      expect(await installer.detect(tempDir)).toBe('npm')
    })

    it('returns null when no lockfile found', async () => {
      expect(await installer.detect(tempDir)).toBeNull()
    })

    it('prefers bun over pnpm when both exist', async () => {
      await writeFile(join(tempDir, 'bun.lockb'), '')
      await writeFile(join(tempDir, 'pnpm-lock.yaml'), '')
      expect(await installer.detect(tempDir)).toBe('bun')
    })
  })

  describe('install', () => {
    it('uses npm install for npm', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['zustand'],
        pm: 'npm',
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'npm install zustand',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('uses pnpm add for pnpm', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['zustand'],
        pm: 'pnpm',
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'pnpm add zustand',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('uses yarn add for yarn', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['zustand'],
        pm: 'yarn',
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'yarn add zustand',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('uses bun add for bun', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['zustand'],
        pm: 'bun',
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'bun add zustand',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('adds --save-dev flag for npm dev deps', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['vitest'],
        pm: 'npm',
        dev: true,
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'npm install --save-dev vitest',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('adds -D flag for non-npm dev deps', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['vitest'],
        pm: 'pnpm',
        dev: true,
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'pnpm add -D vitest',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('joins multiple packages', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: ['zustand', '@tanstack/react-query'],
        pm: 'npm',
      })
      expect(mockedExecSync).toHaveBeenCalledWith(
        'npm install zustand @tanstack/react-query',
        expect.objectContaining({ cwd: '/tmp/app' })
      )
    })

    it('skips when packages array is empty', () => {
      installer.install({
        projectRoot: '/tmp/app',
        packages: [],
        pm: 'npm',
      })
      expect(mockedExecSync).not.toHaveBeenCalled()
    })
  })
})

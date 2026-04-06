import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { patchTsConfig } from '../../../src/utils/tsconfig.js'

describe('patchTsConfig', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('adds decorator options to existing tsconfig', async () => {
    await writeFile(
      join(tempDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true } })
    )

    const result = await patchTsConfig(tempDir)
    expect(result).toBe(true)

    const raw = await readFile(
      join(tempDir, 'tsconfig.json'),
      'utf-8'
    )
    const config = JSON.parse(raw)
    expect(config.compilerOptions.experimentalDecorators).toBe(true)
    expect(config.compilerOptions.strict).toBe(true)
    expect(config.compilerOptions.paths['@features/*']).toEqual([
      './src/features/*',
    ])
    expect(config.compilerOptions.paths['@shared/*']).toEqual([
      './src/shared/*',
    ])
    expect(config.compilerOptions.baseUrl).toBeUndefined()
  })

  it('creates compilerOptions if missing', async () => {
    await writeFile(
      join(tempDir, 'tsconfig.json'),
      JSON.stringify({})
    )

    await patchTsConfig(tempDir)

    const raw = await readFile(
      join(tempDir, 'tsconfig.json'),
      'utf-8'
    )
    const config = JSON.parse(raw)
    expect(config.compilerOptions.experimentalDecorators).toBe(true)
  })

  it('returns false when tsconfig.json is missing', async () => {
    const result = await patchTsConfig(tempDir)
    expect(result).toBe(false)
  })
})

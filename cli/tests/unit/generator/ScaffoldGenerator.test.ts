import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtemp, rm, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ScaffoldGenerator } from '../../../src/generator/ScaffoldGenerator.js'

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

describe('ScaffoldGenerator', () => {
  let tempDir: string
  const generator = new ScaffoldGenerator()

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'spry-test-'))
  })

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
  })

  it('generates error files', async () => {
    await generator.generate(tempDir, 'fetch')

    const domainError = await readFile(
      join(tempDir, 'shared/errors/DomainError.ts'),
      'utf-8'
    )
    expect(domainError).toContain('class DomainError')

    const httpError = await readFile(
      join(tempDir, 'shared/errors/HttpError.ts'),
      'utf-8'
    )
    expect(httpError).toContain('class HttpError')

    const networkError = await readFile(
      join(tempDir, 'shared/errors/NetworkError.ts'),
      'utf-8'
    )
    expect(networkError).toContain('class NetworkError')

    const index = await readFile(
      join(tempDir, 'shared/errors/index.ts'),
      'utf-8'
    )
    expect(index).toContain("export { DomainError }")
  })

  it('generates fetch httpClient when networkLayer is fetch', async () => {
    await generator.generate(tempDir, 'fetch')

    const content = await readFile(
      join(tempDir, 'shared/http/httpClient.ts'),
      'utf-8'
    )
    expect(content).toContain('await fetch(')
    expect(content).not.toContain('axios')
  })

  it('generates axios httpClient when networkLayer is axios', async () => {
    await generator.generate(tempDir, 'axios')

    const content = await readFile(
      join(tempDir, 'shared/http/httpClient.ts'),
      'utf-8'
    )
    expect(content).toContain('axios')
    expect(content).not.toContain('await fetch(')
  })

  it('creates scaffold directories with .gitkeep', async () => {
    await generator.generate(tempDir, 'fetch')

    const dirs = [
      'shared/components',
      'shared/hooks',
      'shared/utils',
      'shared/constants',
      'shared/types',
    ]

    for (const dir of dirs) {
      const gitkeep = join(tempDir, dir, '.gitkeep')
      expect(await exists(gitkeep)).toBe(true)
    }
  })

  it('returns list of created entries', async () => {
    const created = await generator.generate(tempDir, 'fetch')
    expect(created.length).toBeGreaterThan(0)
    expect(created).toContain('shared/errors/DomainError.ts')
    expect(created).toContain('shared/http/httpClient.ts')
  })
})

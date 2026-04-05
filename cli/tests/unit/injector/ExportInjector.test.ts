import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { ExportInjector } from '../../../src/injector/ExportInjector.js'

describe('ExportInjector', () => {
  const injector = new ExportInjector()

  function createFile(content = '') {
    const project = new Project({ useInMemoryFileSystem: true })
    return project.createSourceFile('Test.ts', content)
  }

  it('adds an exported const', () => {
    const sf = createFile()
    const result = injector.inject(
      sf,
      'getProfileUseCase',
      'new GetProfileUseCase(repository)'
    )

    expect(result).toBe(true)
    const text = sf.getFullText()
    expect(text).toContain('export const getProfileUseCase')
    expect(text).toContain('new GetProfileUseCase(repository)')
  })

  it('skips if variable already exists', () => {
    const sf = createFile(
      'export const getProfileUseCase = new GetProfileUseCase(repo);\n'
    )
    const result = injector.inject(
      sf,
      'getProfileUseCase',
      'new GetProfileUseCase(repository)'
    )

    expect(result).toBe(false)
  })
})

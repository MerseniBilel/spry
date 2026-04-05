import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { ImportInjector } from '../../../src/injector/ImportInjector.js'

describe('ImportInjector', () => {
  const injector = new ImportInjector()

  function createFile(content = '') {
    const project = new Project({ useInMemoryFileSystem: true })
    return project.createSourceFile('Test.ts', content)
  }

  it('adds a new import declaration', () => {
    const sf = createFile()
    injector.inject(sf, './GetProfileUseCase', ['GetProfileUseCase'])

    const text = sf.getFullText()
    expect(text).toContain(
      'import { GetProfileUseCase } from "./GetProfileUseCase"'
    )
  })

  it('merges named imports into existing declaration', () => {
    const sf = createFile(
      'import { GetProfileUseCase } from "./usecases";\n'
    )
    injector.inject(sf, './usecases', ['UpdateProfileUseCase'])

    const imports = sf.getImportDeclarations()
    expect(imports).toHaveLength(1)
    const names = imports[0]
      .getNamedImports()
      .map((i) => i.getName())
    expect(names).toContain('GetProfileUseCase')
    expect(names).toContain('UpdateProfileUseCase')
  })

  it('does not duplicate existing named imports', () => {
    const sf = createFile(
      'import { GetProfileUseCase } from "./usecases";\n'
    )
    injector.inject(sf, './usecases', ['GetProfileUseCase'])

    const names = sf
      .getImportDeclarations()[0]
      .getNamedImports()
      .map((i) => i.getName())
    expect(names).toEqual(['GetProfileUseCase'])
  })
})

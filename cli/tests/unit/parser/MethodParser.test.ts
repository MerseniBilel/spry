import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { MethodParser } from '../../../src/parser/MethodParser.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures', 'repositories')

function loadClass(filename: string) {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  const sf = project.addSourceFileAtPath(join(__fixturesDir, filename))
  return sf.getClasses().find((c) => c.isAbstract())!
}

describe('MethodParser', () => {
  const parser = new MethodParser()

  it('parses simple repository with 2 methods', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = parser.parse(cls)

    expect(methods).toHaveLength(2)
    expect(methods[0].name).toBe('getProfile')
    expect(methods[0].decorators.httpMethod).toBe('GET')
    expect(methods[0].decorators.cacheSeconds).toBe(60)
    expect(methods[0].returnType.typeName).toBe('UserProfile')
    expect(methods[0].params).toHaveLength(1)

    expect(methods[1].name).toBe('updateProfile')
    expect(methods[1].decorators.httpMethod).toBe('PATCH')
    expect(methods[1].params).toHaveLength(2)
  })

  it('parses paginated repository', () => {
    const cls = loadClass('ProfileRepository.paginated.ts')
    const methods = parser.parse(cls)

    expect(methods).toHaveLength(2)
    const paginated = methods.find((m) => m.name === 'getProfiles')!
    expect(paginated.decorators.isPaginated).toBe(true)
    expect(paginated.params[0].decorator).toBe('Query')
  })

  it('parses complex repository with 4 methods', () => {
    const cls = loadClass('ProfileRepository.complex.ts')
    const methods = parser.parse(cls)

    expect(methods).toHaveLength(4)
    const verbs = methods.map((m) => m.decorators.httpMethod)
    expect(verbs).toEqual(['GET', 'POST', 'PATCH', 'DELETE'])
  })

  it('resolves void return type for DELETE', () => {
    const cls = loadClass('ProfileRepository.complex.ts')
    const methods = parser.parse(cls)
    const del = methods.find((m) => m.name === 'deleteProfile')!

    expect(del.returnType.isVoid).toBe(true)
    expect(del.returnType.typeName).toBe('void')
  })
})

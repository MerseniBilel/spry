import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { DecoratorReader } from '../../../src/parser/DecoratorReader.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures', 'repositories')

function loadClass(filename: string) {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  const sf = project.addSourceFileAtPath(join(__fixturesDir, filename))
  const cls = sf.getClasses().find((c) => c.isAbstract())!
  return cls
}

describe('DecoratorReader', () => {
  const reader = new DecoratorReader()

  describe('readBaseUrl', () => {
    it('reads @BaseURL value', () => {
      const cls = loadClass('ProfileRepository.simple.ts')
      expect(reader.readBaseUrl(cls)).toBe('/api/v1')
    })
  })

  describe('readMethodDecorators', () => {
    it('reads GET method with Cache', () => {
      const cls = loadClass('ProfileRepository.simple.ts')
      const method = cls.getMethodOrThrow('getProfile')
      const result = reader.readMethodDecorators(method)

      expect(result).toEqual({
        httpMethod: 'GET',
        path: '/profile/:userId',
        cacheSeconds: 60,
        isPaginated: false,
      })
    })

    it('reads PATCH method without Cache', () => {
      const cls = loadClass('ProfileRepository.simple.ts')
      const method = cls.getMethodOrThrow('updateProfile')
      const result = reader.readMethodDecorators(method)

      expect(result).toEqual({
        httpMethod: 'PATCH',
        path: '/profile/:userId',
        cacheSeconds: null,
        isPaginated: false,
      })
    })

    it('reads @Paginated decorator', () => {
      const cls = loadClass('ProfileRepository.paginated.ts')
      const method = cls.getMethodOrThrow('getProfiles')
      const result = reader.readMethodDecorators(method)

      expect(result?.isPaginated).toBe(true)
      expect(result?.httpMethod).toBe('GET')
    })

    it('reads DELETE method', () => {
      const cls = loadClass('ProfileRepository.complex.ts')
      const method = cls.getMethodOrThrow('deleteProfile')
      const result = reader.readMethodDecorators(method)

      expect(result?.httpMethod).toBe('DELETE')
    })
  })

  describe('readParameterDecorators', () => {
    it('reads @Param decorator', () => {
      const cls = loadClass('ProfileRepository.simple.ts')
      const method = cls.getMethodOrThrow('getProfile')
      const params = reader.readParameterDecorators(method)

      expect(params).toHaveLength(1)
      expect(params[0].name).toBe('userId')
      expect(params[0].decorator).toBe('Param')
      expect(params[0].decoratorArg).toBe('userId')
      expect(params[0].type).toBe('string')
    })

    it('reads @Param and @Body decorators', () => {
      const cls = loadClass('ProfileRepository.simple.ts')
      const method = cls.getMethodOrThrow('updateProfile')
      const params = reader.readParameterDecorators(method)

      expect(params).toHaveLength(2)
      expect(params[0].decorator).toBe('Param')
      expect(params[1].decorator).toBe('Body')
      expect(params[1].name).toBe('input')
    })

    it('reads @Query decorator', () => {
      const cls = loadClass('ProfileRepository.paginated.ts')
      const method = cls.getMethodOrThrow('getProfiles')
      const params = reader.readParameterDecorators(method)

      expect(params).toHaveLength(1)
      expect(params[0].decorator).toBe('Query')
      expect(params[0].decoratorArg).toBe('page')
    })
  })
})

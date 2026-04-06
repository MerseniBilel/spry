import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { MethodParser } from '../../../src/parser/MethodParser.js'
import { NormalizationMapper } from '../../../src/parser/NormalizationMapper.js'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __fixturesDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'fixtures', 'repositories')

function loadClass(filename: string) {
  const project = new Project({ skipAddingFilesFromTsConfig: true })
  const sf = project.addSourceFileAtPath(join(__fixturesDir, filename))
  return sf.getClasses().find((c) => c.isAbstract())!
}

describe('NormalizationMapper', () => {
  const methodParser = new MethodParser()
  const mapper = new NormalizationMapper()

  it('splits methods into queries and mutations', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.queries).toHaveLength(1)
    expect(ctx.mutations).toHaveLength(1)
    expect(ctx.paginatedQueries).toHaveLength(0)
    expect(ctx.queries[0].name).toBe('getProfile')
    expect(ctx.mutations[0].name).toBe('updateProfile')
  })

  it('splits paginated queries correctly', () => {
    const cls = loadClass('ProfileRepository.paginated.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.queries).toHaveLength(1)
    expect(ctx.paginatedQueries).toHaveLength(1)
    expect(ctx.paginatedQueries[0].name).toBe('getProfiles')
  })

  it('computes fullPath from baseUrl + path', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.queries[0].fullPath).toBe('/api/v1/profile/:userId')
  })

  it('sets feature name variants', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'user-profile', baseUrl: '/api', methods })

    expect(ctx.featureName).toBe('userProfile')
    expect(ctx.FeatureName).toBe('UserProfile')
    expect(ctx.featureNameKebab).toBe('user-profile')
  })

  it('derives entityName from first query return type', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.entityName).toBe('UserProfile')
  })

  it('sets hasBody and bodyType for mutations', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.mutations[0].hasBody).toBe(true)
    expect(ctx.mutations[0].bodyParamName).toBe('input')
  })

  it('computes PascalCase method names', () => {
    const cls = loadClass('ProfileRepository.simple.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.queries[0].Name).toBe('GetProfile')
    expect(ctx.mutations[0].Name).toBe('UpdateProfile')
  })

  it('sets hasNext for comma separation', () => {
    const cls = loadClass('ProfileRepository.complex.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    // allMethods has 4 items, last should have hasNext=false
    expect(ctx.allMethods[0].hasNext).toBe(true)
    expect(ctx.allMethods[ctx.allMethods.length - 1].hasNext).toBe(
      false
    )
  })

  it('sets boolean helpers', () => {
    const cls = loadClass('ProfileRepository.complex.ts')
    const methods = methodParser.parse(cls)
    const ctx = mapper.normalize({ featureName: 'profile', baseUrl: '/api/v1', methods })

    expect(ctx.hasQueries).toBe(true)
    expect(ctx.hasMutations).toBe(true)
    expect(ctx.hasPaginatedQueries).toBe(false)
  })
})

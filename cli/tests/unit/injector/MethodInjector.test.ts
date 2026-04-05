import { describe, it, expect } from 'vitest'
import { Project } from 'ts-morph'
import { MethodInjector } from '../../../src/injector/MethodInjector.js'

describe('MethodInjector', () => {
  const injector = new MethodInjector()

  function createClass() {
    const project = new Project({ useInMemoryFileSystem: true })
    const sf = project.createSourceFile(
      'Test.ts',
      'export class TestClass {}'
    )
    return sf.getClassOrThrow('TestClass')
  }

  it('injects a method into a class', () => {
    const cls = createClass()
    const result = injector.inject(cls, {
      name: 'getProfile',
      isAsync: true,
      returnType: 'Promise<UserProfile>',
      parameters: [{ name: 'userId', type: 'string' }],
      body: 'return this.dataSource.getProfile(userId)',
    })

    expect(result).toBe(true)
    expect(cls.getMethod('getProfile')).toBeDefined()
    const text = cls.getSourceFile().getFullText()
    expect(text).toContain('async getProfile')
    expect(text).toContain('userId: string')
  })

  it('skips if method already exists', () => {
    const cls = createClass()
    injector.inject(cls, {
      name: 'getProfile',
      isAsync: true,
      returnType: 'Promise<void>',
      parameters: [],
      body: '',
    })

    const result = injector.inject(cls, {
      name: 'getProfile',
      isAsync: true,
      returnType: 'Promise<void>',
      parameters: [],
      body: '',
    })

    expect(result).toBe(false)
  })
})

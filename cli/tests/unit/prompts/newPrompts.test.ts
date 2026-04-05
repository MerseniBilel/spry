import { describe, it, expect } from 'vitest'
import { validateFeatureName } from '../../../src/prompts/newPrompts.js'

describe('validateFeatureName', () => {
  it('accepts simple lowercase names', () => {
    expect(validateFeatureName('profile')).toBeUndefined()
  })

  it('accepts names with numbers', () => {
    expect(validateFeatureName('auth2')).toBeUndefined()
  })

  it('accepts kebab-case names', () => {
    expect(validateFeatureName('user-profile')).toBeUndefined()
  })

  it('rejects empty strings', () => {
    expect(validateFeatureName('')).toBe('Feature name is required')
  })

  it('rejects whitespace-only strings', () => {
    expect(validateFeatureName('   ')).toBe('Feature name is required')
  })

  it('rejects uppercase letters', () => {
    expect(validateFeatureName('Profile')).toBeDefined()
  })

  it('rejects underscores', () => {
    expect(validateFeatureName('user_profile')).toBeDefined()
  })

  it('rejects names starting with a number', () => {
    expect(validateFeatureName('2auth')).toBeDefined()
  })

  it('rejects names starting with a hyphen', () => {
    expect(validateFeatureName('-profile')).toBeDefined()
  })

  it('rejects spaces', () => {
    expect(validateFeatureName('user profile')).toBeDefined()
  })
})

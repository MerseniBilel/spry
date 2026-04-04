import { describe, it, expect } from 'vitest'
import { pascalCase, camelCase, kebabCase } from '../../../src/utils/string.js'

describe('string utils', () => {
  describe('pascalCase', () => {
    it('converts kebab-case', () => {
      expect(pascalCase('user-profile')).toBe('UserProfile')
    })

    it('converts snake_case', () => {
      expect(pascalCase('user_profile')).toBe('UserProfile')
    })

    it('converts single word', () => {
      expect(pascalCase('profile')).toBe('Profile')
    })
  })

  describe('camelCase', () => {
    it('converts kebab-case', () => {
      expect(camelCase('user-profile')).toBe('userProfile')
    })

    it('converts single word', () => {
      expect(camelCase('Profile')).toBe('profile')
    })
  })

  describe('kebabCase', () => {
    it('converts PascalCase', () => {
      expect(kebabCase('UserProfile')).toBe('user-profile')
    })

    it('converts camelCase', () => {
      expect(kebabCase('userProfile')).toBe('user-profile')
    })
  })
})

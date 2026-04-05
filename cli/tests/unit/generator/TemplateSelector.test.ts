import { describe, it, expect } from 'vitest'
import { TemplateSelector } from '../../../src/generator/TemplateSelector.js'
import type { SpryConfig } from '../../../src/types/config.js'

describe('TemplateSelector', () => {
  const selector = new TemplateSelector()

  const fetchConfig: SpryConfig = {
    stateManagement: 'zustand',
    networkLayer: 'fetch',
    queryClient: 'react-query',
    packageManager: 'npm',
    checksum: '',
  }

  const axiosConfig: SpryConfig = {
    ...fetchConfig,
    networkLayer: 'axios',
  }

  it('selects fetch datasource template', () => {
    const map = selector.select(fetchConfig)
    expect(map.datasource).toBe('data/datasource.fetch.mustache')
  })

  it('selects axios datasource template', () => {
    const map = selector.select(axiosConfig)
    expect(map.datasource).toBe('data/datasource.axios.mustache')
  })

  it('returns consistent template paths for other files', () => {
    const map = selector.select(fetchConfig)
    expect(map.usecase).toBe('domain/usecase.mustache')
    expect(map.repositoryImpl).toBe('data/repository.impl.mustache')
    expect(map.queries).toBe(
      'presentation/queries.react-query.mustache'
    )
    expect(map.store).toBe('presentation/store.zustand.mustache')
    expect(map.di).toBe('di/di.mustache')
  })
})

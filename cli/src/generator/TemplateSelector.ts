import type { SpryConfig } from '../types/config.js'

export interface TemplateMap {
  usecase: string
  repositoryImpl: string
  datasource: string
  queries: string
  store: string
  di: string
}

export class TemplateSelector {
  select(config: SpryConfig): TemplateMap {
    const datasource = config.networkLayer === 'axios'
      ? 'data/datasource.axios.mustache'
      : 'data/datasource.fetch.mustache'

    return {
      usecase: 'domain/usecase.mustache',
      repositoryImpl: 'data/repository.impl.mustache',
      datasource,
      queries: 'presentation/queries.react-query.mustache',
      store: 'presentation/store.zustand.mustache',
      di: 'di/di.mustache',
    }
  }
}

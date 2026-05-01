import type { SpryConfig } from '../types/config.js'

export interface StoreSelection {
  template: string
  outputFilename: (camelFeature: string) => string
}

export interface TemplateMap {
  usecase: string
  repositoryImpl: string
  datasource: string
  queries: string
  store: StoreSelection
  di: string
}

export class TemplateSelector {
  select(config: SpryConfig): TemplateMap {
    const datasource =
      config.networkLayer === 'axios'
        ? 'data/datasource.axios.mustache'
        : 'data/datasource.fetch.mustache'

    const store: StoreSelection =
      config.stateManagement === 'jotai'
        ? {
            template: 'presentation/store.jotai.mustache',
            outputFilename: (camel) => `${camel}Atoms.ts`,
          }
        : {
            template: 'presentation/store.zustand.mustache',
            outputFilename: (camel) => `${camel}Store.ts`,
          }

    return {
      usecase: 'domain/usecase.mustache',
      repositoryImpl: 'data/repository.impl.mustache',
      datasource,
      queries: 'presentation/queries.react-query.mustache',
      store,
      di: 'di/di.mustache',
    }
  }
}

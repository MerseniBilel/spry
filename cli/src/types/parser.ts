export interface ParsedDecorators {
  httpMethod: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  path: string
  cacheSeconds: number | null
  isPaginated: boolean
}

export interface ParsedReturnType {
  typeName: string
  baseTypeName: string
  isNullable: boolean
  isArray: boolean
  isVoid: boolean
}

export interface ParsedParam {
  name: string
  type: string
  decorator: 'Param' | 'Query' | 'Body' | 'Header'
  decoratorArg: string | null
}

export interface ParsedMethod {
  name: string
  decorators: ParsedDecorators
  returnType: ParsedReturnType
  params: ParsedParam[]
}

export interface NormalizedParam {
  name: string
  type: string
  decorator: 'Param' | 'Query' | 'Body' | 'Header'
  isPathParam: boolean
  isQueryParam: boolean
  isBody: boolean
  isHeader: boolean
  hasNext: boolean
}

export interface NormalizedMethod {
  name: string
  Name: string
  camelName: string
  httpMethod: string
  lowerHttpMethod: string
  path: string
  fullPath: string
  interpolatedPath: string
  returnType: string
  isNullable: boolean
  isArray: boolean
  isVoid: boolean
  cacheSeconds: number | null
  methodTypeImports: { path: string; names: string; hasNext: boolean }[]
  hasMethodTypeImports: boolean
  methodTypeImportsList: string
  params: NormalizedParam[]
  hasParams: boolean
  hasQueryParams: boolean
  hasBody: boolean
  bodyType: string | null
  bodyParamName: string | null
  paginationParams: NormalizedParam[]
  hasPaginationParams: boolean
  hasNext: boolean
}

export interface NormalizedContext {
  featureName: string
  FeatureName: string
  featureNameKebab: string
  entityName: string
  baseUrl: string
  queries: NormalizedMethod[]
  paginatedQueries: NormalizedMethod[]
  mutations: NormalizedMethod[]
  allMethods: NormalizedMethod[]
  hasQueries: boolean
  hasPaginatedQueries: boolean
  hasMutations: boolean
  reactQueryImports: string
  typeImports: { path: string; names: string; hasNext: boolean }[]
  hasTypeImports: boolean
  typeImportsList: string
}

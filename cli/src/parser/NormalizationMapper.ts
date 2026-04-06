import { pascalCase, camelCase, kebabCase } from '../utils/string.js'
import type {
  ParsedMethod,
  NormalizedContext,
  NormalizedMethod,
  NormalizedParam,
} from '../types/parser.js'

export class NormalizationMapper {
  normalize(opts: {
    featureName: string
    baseUrl: string
    methods: ParsedMethod[]
    typeSourceMap?: Map<string, string>
  }): NormalizedContext {
    const { featureName, baseUrl, methods, typeSourceMap } = opts
    const queries: NormalizedMethod[] = []
    const paginatedQueries: NormalizedMethod[] = []
    const mutations: NormalizedMethod[] = []

    for (const method of methods) {
      const normalized = this.normalizeMethod({ method, baseUrl, featureName, typeSourceMap })

      if (method.decorators.isPaginated) {
        paginatedQueries.push(normalized)
      } else if (method.decorators.httpMethod === 'GET') {
        queries.push(normalized)
      } else {
        mutations.push(normalized)
      }
    }

    this.setHasNext(queries)
    this.setHasNext(paginatedQueries)
    this.setHasNext(mutations)

    const allMethods = [...queries, ...paginatedQueries, ...mutations]
    this.setHasNext(allMethods)

    const entityName = this.deriveEntityName(queries, paginatedQueries, featureName)

    return {
      featureName: camelCase(featureName),
      FeatureName: pascalCase(featureName),
      featureNameKebab: kebabCase(featureName),
      entityName,
      baseUrl,
      queries,
      paginatedQueries,
      mutations,
      allMethods,
      hasQueries: queries.length > 0,
      hasPaginatedQueries: paginatedQueries.length > 0,
      hasMutations: mutations.length > 0,
      reactQueryImports: this.buildReactQueryImports(queries, paginatedQueries, mutations),
      ...this.collectTypeImports(allMethods, featureName, typeSourceMap),
    }
  }

  private normalizeMethod(opts: {
    method: ParsedMethod
    baseUrl: string
    featureName: string
    typeSourceMap?: Map<string, string>
  }): NormalizedMethod {
    const { method, baseUrl, featureName, typeSourceMap } = opts
    const params = this.normalizeParams(method.params)
    const bodyParam = params.find((p) => p.isBody)
    const rawBodyParam = method.params.find((p) => p.decorator === 'Body')

    return {
      name: method.name,
      Name: pascalCase(method.name),
      camelName: camelCase(method.name),
      httpMethod: method.decorators.httpMethod,
      lowerHttpMethod: method.decorators.httpMethod.toLowerCase(),
      path: method.decorators.path,
      fullPath: baseUrl + method.decorators.path,
      interpolatedPath: this.interpolatePath(baseUrl + method.decorators.path, params),
      returnType: method.returnType.typeName,
      isNullable: method.returnType.isNullable,
      isArray: method.returnType.isArray,
      isVoid: method.returnType.isVoid,
      cacheSeconds: method.decorators.cacheSeconds,
      ...this.collectMethodTypeImports({ method, params, featureName, typeSourceMap }),
      params,
      hasParams: params.length > 0,
      hasQueryParams: params.some((p) => p.isQueryParam),
      hasBody: !!bodyParam,
      bodyType: rawBodyParam?.type ?? null,
      bodyParamName: bodyParam?.name ?? null,
      paginationParams: this.buildPaginationParams(params),
      hasPaginationParams: this.buildPaginationParams(params).length > 0,
      hasNext: false,
    }
  }

  private normalizeParams(params: ParsedMethod['params']): NormalizedParam[] {
    const normalized = params.map((p) => ({
      name: p.name,
      type: p.type,
      decorator: p.decorator,
      isPathParam: p.decorator === 'Param',
      isQueryParam: p.decorator === 'Query',
      isBody: p.decorator === 'Body',
      isHeader: p.decorator === 'Header',
      hasNext: false,
    }))

    this.setHasNext(normalized)
    return normalized
  }

  private setHasNext(items: { hasNext: boolean }[]): void {
    for (let i = 0; i < items.length; i++) {
      items[i].hasNext = i < items.length - 1
    }
  }

  private collectMethodTypeImports(opts: {
    method: ParsedMethod
    params: NormalizedParam[]
    featureName: string
    typeSourceMap?: Map<string, string>
  }) {
    const { method, params, featureName, typeSourceMap } = opts
    const types = this.extractTypeNames(method, params)
    const grouped = this.groupBySourcePath(
      types, featureName, typeSourceMap
    )

    return {
      methodTypeImports: grouped,
      hasMethodTypeImports: grouped.length > 0,
      methodTypeImportsList: types.join(', '),
    }
  }

  private collectTypeImports(
    methods: NormalizedMethod[],
    featureName: string,
    typeSourceMap?: Map<string, string>
  ) {
    const primitives = new Set([
      'string', 'number', 'boolean', 'void',
      'undefined', 'null', 'any', 'unknown',
    ])
    const types = new Set<string>()

    for (const method of methods) {
      if (!method.isVoid) {
        const base = method.isArray
          ? method.returnType.replace('[]', '')
          : method.returnType
        if (!primitives.has(base)) types.add(base)
      }
      for (const param of method.params) {
        if (!primitives.has(param.type) && param.isBody) {
          types.add(param.type)
        }
      }
    }

    const sorted = [...types].sort()
    const grouped = this.groupBySourcePath(
      sorted, featureName, typeSourceMap
    )

    return {
      typeImports: grouped,
      hasTypeImports: grouped.length > 0,
      typeImportsList: sorted.join(', '),
    }
  }

  private extractTypeNames(
    method: ParsedMethod,
    params: NormalizedParam[]
  ): string[] {
    const primitives = new Set([
      'string', 'number', 'boolean', 'void',
      'undefined', 'null', 'any', 'unknown',
    ])
    const types = new Set<string>()

    if (
      !method.returnType.isVoid &&
      !primitives.has(method.returnType.baseTypeName)
    ) {
      types.add(method.returnType.baseTypeName)
    }
    for (const param of params) {
      if (!primitives.has(param.type) && param.isBody) {
        types.add(param.type)
      }
    }
    return [...types].sort()
  }

  private groupBySourcePath(
    typeNames: string[],
    featureName: string,
    typeSourceMap?: Map<string, string>
  ) {
    const kebab = kebabCase(featureName)
    const byPath = new Map<string, string[]>()

    for (const name of typeNames) {
      const sourcePath = typeSourceMap?.get(name)
        ?? `@features/${kebab}/domain/models/${name}`
      const existing = byPath.get(sourcePath) ?? []
      existing.push(name)
      byPath.set(sourcePath, existing)
    }

    const entries = [...byPath.entries()].sort(([a], [b]) =>
      a.localeCompare(b)
    )
    return entries.map(([path, names], i) => ({
      path,
      names: names.join(', '),
      hasNext: i < entries.length - 1,
    }))
  }

  private buildReactQueryImports(
    queries: NormalizedMethod[],
    paginatedQueries: NormalizedMethod[],
    mutations: NormalizedMethod[]
  ): string {
    const imports: string[] = []
    if (queries.length > 0) imports.push('useQuery')
    if (mutations.length > 0) imports.push('useMutation')
    if (paginatedQueries.length > 0) imports.push('useInfiniteQuery')
    return imports.join(', ')
  }

  private buildPaginationParams(
    params: NormalizedParam[]
  ): NormalizedParam[] {
    const queryParams = params.filter((p) => p.isQueryParam)
    // First @Query param is the page param (handled by pageParam)
    const extra = queryParams.slice(1)
    this.setHasNext(extra)
    return extra
  }

  private interpolatePath(path: string, params: NormalizedParam[]): string {
    let result = path.replace(/:(\w+)/g, '${$1}')
    const queryParams = params.filter((p) => p.isQueryParam)
    if (queryParams.length > 0) {
      const qs = queryParams
        .map((p) => `${p.name}=\${${p.name}}`)
        .join('&')
      result += `?${qs}`
    }
    return result
  }

  private deriveEntityName(
    queries: NormalizedMethod[],
    paginatedQueries: NormalizedMethod[],
    featureName: string
  ): string {
    const firstQuery = queries[0] ?? paginatedQueries[0]
    if (firstQuery && !firstQuery.isVoid) {
      return firstQuery.returnType
    }
    return pascalCase(featureName)
  }
}

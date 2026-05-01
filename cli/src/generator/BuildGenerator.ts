import { join } from 'node:path'
import { IndentationText, Project } from 'ts-morph'
import Mustache from 'mustache'
import { FileGenerator } from './FileGenerator.js'
import { TemplateSelector } from './TemplateSelector.js'
import { ImportInjector } from '../injector/ImportInjector.js'
import { MethodInjector } from '../injector/MethodInjector.js'
import { ExportInjector } from '../injector/ExportInjector.js'
import {
  readFileContent,
  writeFileWithDir,
  fileExists,
  getTemplatesDir,
} from '../utils/fs.js'
import type { SpryConfig } from '../types/config.js'
import type { NormalizedContext, NormalizedMethod } from '../types/parser.js'

export interface BuildResult {
  created: string[]
  injected: string[]
  skipped: string[]
}

export class BuildGenerator {
  private fileGenerator = new FileGenerator()
  private templateSelector = new TemplateSelector()
  private importInjector = new ImportInjector()
  private methodInjector = new MethodInjector()
  private exportInjector = new ExportInjector()

  async generateAll(
    srcRoot: string,
    config: SpryConfig,
    context: NormalizedContext
  ): Promise<BuildResult> {
    const result: BuildResult = { created: [], injected: [], skipped: [] }
    const templates = this.templateSelector.select(config)
    const featureDir = join(
      srcRoot,
      'features',
      context.featureNameKebab
    )

    // Use cases — one file per method
    for (const method of context.allMethods) {
      const methodContext = { ...context, ...method }
      const outputPath = join(
        featureDir,
        'domain',
        'usecases',
        `${method.Name}UseCase.ts`
      )
      await this.fileGenerator.renderAndWrite(
        templates.usecase,
        outputPath,
        methodContext as unknown as Record<string, string>
      )
      result.created.push(`domain/usecases/${method.Name}UseCase.ts`)
    }

    // RepositoryImpl
    const repoImplPath = join(
      featureDir,
      'data',
      'repositories',
      `${context.FeatureName}RepositoryImpl.ts`
    )
    await this.renderTemplate(
      templates.repositoryImpl,
      repoImplPath,
      context
    )
    result.created.push(
      `data/repositories/${context.FeatureName}RepositoryImpl.ts`
    )

    // RemoteDataSource
    const dsPath = join(
      featureDir,
      'data',
      'datasources',
      `${context.FeatureName}RemoteDataSource.ts`
    )
    await this.renderTemplate(templates.datasource, dsPath, context)
    result.created.push(
      `data/datasources/${context.FeatureName}RemoteDataSource.ts`
    )

    // Queries (React Query hooks)
    const queriesPath = join(
      featureDir,
      'presentation',
      'hooks',
      `${context.featureName}Queries.ts`
    )
    await this.renderTemplate(
      templates.queries,
      queriesPath,
      context
    )
    result.created.push(
      `presentation/hooks/${context.featureName}Queries.ts`
    )

    // Store/Atoms (developer-owned — only on first build)
    const storeFilename = templates.store.outputFilename(
      context.featureName
    )
    const storePath = join(
      featureDir,
      'presentation',
      'state',
      storeFilename
    )
    if (await fileExists(storePath)) {
      result.skipped.push(
        `presentation/state/${storeFilename} (developer-owned)`
      )
    } else {
      await this.renderTemplate(
        templates.store.template,
        storePath,
        context
      )
      result.created.push(`presentation/state/${storeFilename}`)
    }

    // Screen view (developer-owned — only on first build)
    const screenPath = join(
      featureDir,
      'presentation',
      'views',
      `${context.FeatureName}Screen.tsx`
    )
    if (await fileExists(screenPath)) {
      result.skipped.push(
        `presentation/views/${context.FeatureName}Screen.tsx (developer-owned)`
      )
    } else {
      await this.renderTemplate(
        'presentation/view.mustache',
        screenPath,
        context
      )
      result.created.push(
        `presentation/views/${context.FeatureName}Screen.tsx`
      )
    }

    // DI wiring
    const diPath = join(featureDir, 'di.ts')
    await this.renderTemplate(templates.di, diPath, context)
    result.created.push('di.ts')

    // Barrel exports
    const hooksIndex = context.allMethods
      .map((m) => `export { use${m.Name} } from './${context.featureName}Queries'`)
      .join('\n') + '\n'
    await writeFileWithDir(
      join(featureDir, 'presentation', 'hooks', 'index.ts'),
      hooksIndex
    )
    result.created.push('presentation/hooks/index.ts')

    const usecasesIndex = context.allMethods
      .map((m) => `export { ${m.Name}UseCase } from './${m.Name}UseCase'`)
      .join('\n') + '\n'
    await writeFileWithDir(
      join(featureDir, 'domain', 'usecases', 'index.ts'),
      usecasesIndex
    )
    result.created.push('domain/usecases/index.ts')

    return result
  }

  async injectMethods(opts: {
    srcRoot: string
    config: SpryConfig
    context: NormalizedContext
    newMethods: NormalizedMethod[]
  }): Promise<BuildResult> {
    const { srcRoot, config, context, newMethods } = opts
    const result: BuildResult = { created: [], injected: [], skipped: [] }
    const templates = this.templateSelector.select(config)
    const featureDir = join(
      srcRoot,
      'features',
      context.featureNameKebab
    )

    // Create new use case files
    for (const method of newMethods) {
      const methodContext = { ...context, ...method }
      const outputPath = join(
        featureDir,
        'domain',
        'usecases',
        `${method.Name}UseCase.ts`
      )
      await this.fileGenerator.renderAndWrite(
        templates.usecase,
        outputPath,
        methodContext as unknown as Record<string, string>
      )
      result.created.push(`domain/usecases/${method.Name}UseCase.ts`)
    }

    // Inject into RepositoryImpl, DataSource, queries, di.ts via ts-morph
    const project = new Project({
      manipulationSettings: { indentationText: IndentationText.TwoSpaces },
    })

    // Inject into RepositoryImpl
    const repoImplPath = join(
      featureDir,
      'data',
      'repositories',
      `${context.FeatureName}RepositoryImpl.ts`
    )
    if (await fileExists(repoImplPath)) {
      const sf = project.addSourceFileAtPath(repoImplPath)
      for (const method of newMethods) {
        for (const imp of method.methodTypeImports) {
          this.importInjector.inject(sf, imp.path, imp.names.split(', '))
        }
      }
      const cls = sf.getClasses()[0]
      if (cls) {
        for (const method of newMethods) {
          const paramList = method.params
            .map((p) => `${p.name}`)
            .join(', ')
          const injected = this.methodInjector.inject(cls, {
            name: method.name,
            isAsync: true,
            returnType: `Promise<${method.returnType}>`,
            parameters: method.params.map((p) => ({
              name: p.name,
              type: p.type,
            })),
            body: `return this.dataSource.${method.name}(${paramList})`,
          })
          if (injected)
            result.injected.push(
              `${context.FeatureName}RepositoryImpl.ts → ${method.name}()`
            )
        }
        await sf.save()

      }
    }

    // Inject into RemoteDataSource
    const dsPath = join(
      featureDir,
      'data',
      'datasources',
      `${context.FeatureName}RemoteDataSource.ts`
    )
    if (await fileExists(dsPath)) {
      const sf = project.addSourceFileAtPath(dsPath)
      for (const method of newMethods) {
        for (const imp of method.methodTypeImports) {
          this.importInjector.inject(sf, imp.path, imp.names.split(', '))
        }
      }
      const cls = sf.getClasses()[0]
      if (cls) {
        for (const method of newMethods) {
          const isGet = method.httpMethod === 'GET'
          const url = '`' + method.interpolatedPath + '`'
          const body = isGet
            ? `return httpClient.get<${method.returnType}>(${url})`
            : `return httpClient.${method.lowerHttpMethod}<${method.returnType}>(${url}${method.hasBody ? `, ${method.bodyParamName}` : ''})`

          const injected = this.methodInjector.inject(cls, {
            name: method.name,
            isAsync: true,
            returnType: `Promise<${method.returnType}>`,
            parameters: method.params.map((p) => ({
              name: p.name,
              type: p.type,
            })),
            body,
          })
          if (injected)
            result.injected.push(
              `${context.FeatureName}RemoteDataSource.ts → ${method.name}()`
            )
        }
        await sf.save()

      }
    }

    // Re-render queries file (Spry-owned — safe to regenerate with all methods)
    const queriesPath = join(
      featureDir,
      'presentation',
      'hooks',
      `${context.featureName}Queries.ts`
    )
    await this.renderTemplate(
      templates.queries,
      queriesPath,
      context
    )
    result.injected.push(
      `${context.featureName}Queries.ts (regenerated)`
    )

    // Inject into di.ts
    const diPath = join(featureDir, 'di.ts')
    if (await fileExists(diPath)) {
      const sf = project.addSourceFileAtPath(diPath)
      for (const method of newMethods) {
        this.importInjector.inject(
          sf,
          `./domain/usecases/${method.Name}UseCase`,
          [`${method.Name}UseCase`]
        )
        this.exportInjector.inject(
          sf,
          `${method.camelName}UseCase`,
          `new ${method.Name}UseCase(repository)`
        )
        result.injected.push(`di.ts → ${method.camelName}UseCase`)
      }
      await sf.save()
    }

    // Skip developer-owned
    result.skipped.push(
      `${templates.store.outputFilename(context.featureName)} (developer-owned)`
    )

    return result
  }

  private async renderTemplate(
    templatePath: string,
    outputPath: string,
    context: NormalizedContext
  ): Promise<void> {
    const fullTemplatePath = join(getTemplatesDir(), templatePath)
    const template = await readFileContent(fullTemplatePath)
    const content = Mustache.render(template, context).trimEnd() + '\n'
    await writeFileWithDir(outputPath, content)
  }

}

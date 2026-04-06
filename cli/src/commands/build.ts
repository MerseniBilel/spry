import { Command } from 'commander'
import * as clack from '@clack/prompts'
import { join } from 'node:path'
import { logger } from '../utils/logger.js'
import { pascalCase } from '../utils/string.js'
import { fileExists } from '../utils/fs.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { ConfigIntegrityChecker } from '../config/ConfigIntegrityChecker.js'
import { ManifestReader } from '../manifest/ManifestReader.js'
import { ManifestWriter } from '../manifest/ManifestWriter.js'
import { ManifestValidator } from '../manifest/ManifestValidator.js'
import { RepositoryParser } from '../parser/RepositoryParser.js'
import { DecoratorReader } from '../parser/DecoratorReader.js'
import { MethodParser } from '../parser/MethodParser.js'
import { NormalizationMapper } from '../parser/NormalizationMapper.js'
import { TypeSourceMapper } from '../parser/TypeSourceMapper.js'
import { BuildGenerator } from '../generator/BuildGenerator.js'
import { validateFeatureName } from '../prompts/newPrompts.js'
import type { SpryConfig } from '../types/config.js'
import type { NormalizedContext } from '../types/parser.js'

interface BuildOptions {
  dryRun?: boolean
  force?: boolean
}

export const buildCommand = new Command('build')
  .argument(
    '<featureName>',
    'Name of the feature to build (or "all")'
  )
  .option('--dry-run', 'Print what would be generated without writing')
  .option('--force', 'Regenerate all Spry-owned files from scratch')
  .description('Generate implementation files from a domain contract')
  .action(async (featureName: string, options: BuildOptions) => {
    logger.intro('spry build')

    try {
      const projectRoot = process.cwd()
      const configReader = new ConfigReader()
      const config = await configReader.read(projectRoot)

      if (!config) {
        logger.error(
          'No .spryrc.json found. Run `spry init` first.'
        )
        process.exitCode = 1
        return
      }

      const checker = new ConfigIntegrityChecker()
      if (!(await checker.verify(projectRoot))) {
        logger.error(
          '.spryrc.json has been manually modified. Run `spry init` again to reconfigure.'
        )
        process.exitCode = 1
        return
      }

      const manifestReader = new ManifestReader()

      if (featureName === 'all') {
        const manifest = await manifestReader.read(projectRoot)
        const features = Object.keys(manifest?.features ?? {})
        if (features.length === 0) {
          logger.error(
            'No features found. Run `spry new <featureName>` first.'
          )
          process.exitCode = 1
          return
        }
        for (const name of features) {
          await buildFeature({ featureName: name, projectRoot, config, options })
        }
      } else {
        const validationError = validateFeatureName(featureName)
        if (validationError) {
          logger.error(validationError)
          process.exitCode = 1
          return
        }

        if (!(await manifestReader.hasFeature(projectRoot, featureName))) {
          logger.error(
            `Feature "${featureName}" not found. Run \`spry new ${featureName}\` first.`
          )
          process.exitCode = 1
          return
        }

        await buildFeature({ featureName, projectRoot, config, options })
      }

      logger.outro('Build complete')
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Build failed: ${message}`)
      process.exitCode = 1
    }
  })

async function buildFeature(opts: {
  featureName: string
  projectRoot: string
  config: SpryConfig
  options: BuildOptions
}): Promise<void> {
  const { featureName, projectRoot, config, options } = opts
  const srcRoot = join(projectRoot, 'src')
  const pascal = pascalCase(featureName)
  const repoPath = join(
    srcRoot,
    'features',
    featureName,
    'domain',
    'repositories',
    `${pascal}Repository.ts`
  )

  if (!(await fileExists(repoPath))) {
    logger.error(`Repository file not found: ${pascal}Repository.ts`)
    process.exitCode = 1
    return
  }

  const spin = clack.spinner()
  spin.start(`Parsing ${pascal}Repository...`)

  const repoParser = new RepositoryParser()
  const { classDecl, sourceFile } = repoParser.parse(repoPath)

  const decoratorReader = new DecoratorReader()
  const baseUrl = decoratorReader.readBaseUrl(classDecl) ?? ''

  const methodParser = new MethodParser()
  const parsedMethods = methodParser.parse(classDecl)

  if (parsedMethods.length === 0) {
    spin.stop(`No decorated methods found in ${pascal}Repository`)
    logger.warn(
      'Add methods with @GET, @POST, etc. decorators, then run spry build again.'
    )
    return
  }

  const typeSourceMapper = new TypeSourceMapper()
  const typeSourceMap = typeSourceMapper.build(sourceFile, featureName)

  const mapper = new NormalizationMapper()
  const context = mapper.normalize({
    featureName, baseUrl, methods: parsedMethods, typeSourceMap,
  })
  const count = parsedMethods.length
  spin.stop(`Parsed ${count} method${count > 1 ? 's' : ''}`)

  if (options.dryRun) {
    logDryRun(context)
    return
  }

  const validator = new ManifestValidator()
  const methodNames = parsedMethods.map((m) => m.name)
  const diff = await validator.diff(projectRoot, featureName, methodNames)

  const generator = new BuildGenerator()
  let result

  const isFirstBuild = diff.existingMethods.length === 0

  if (options.force || isFirstBuild) {
    if (options.force && !isFirstBuild) {
      const confirmed = await clack.confirm({
        message: `Force regenerate all files for "${featureName}"?`,
        initialValue: false,
      })
      if (clack.isCancel(confirmed) || !confirmed) {
        logger.info('Aborted.')
        return
      }
    }

    spin.start('Generating files...')
    result = await generator.generateAll(srcRoot, config, context)
    spin.stop('Files generated')
  } else {
    if (diff.newMethods.length === 0) {
      logger.info(
        'No new methods to generate. Everything is up to date.'
      )
      return
    }

    const newNormalized = context.allMethods.filter((m) =>
      diff.newMethods.includes(m.name)
    )
    const n = diff.newMethods.length

    spin.start(
      `Injecting ${n} new method${n > 1 ? 's' : ''}...`
    )
    result = await generator.injectMethods({
      srcRoot,
      config,
      context,
      newMethods: newNormalized,
    })
    spin.stop('Injection complete')
  }

  for (const entry of result.created) {
    logger.success(`Created: ${entry}`)
  }
  for (const entry of result.injected) {
    logger.success(`Injected: ${entry}`)
  }
  for (const entry of result.skipped) {
    logger.info(`Skipped: ${entry}`)
  }

  // Update manifest
  const manifestWriter = new ManifestWriter()
  const manifest =
    (await new ManifestReader().read(projectRoot)) ?? {
      features: {},
    }
  manifest.features[featureName] = {
    generatedMethods: methodNames,
  }
  await manifestWriter.write(projectRoot, manifest)
}

function logDryRun(context: NormalizedContext): void {
  const lines: string[] = [
    `Feature: ${context.FeatureName}`,
    `Base URL: ${context.baseUrl}`,
    '',
    'Would generate:',
  ]

  for (const m of context.allMethods) {
    lines.push(`  - domain/usecases/${m.Name}UseCase.ts`)
  }
  lines.push(
    `  - data/repositories/${context.FeatureName}RepositoryImpl.ts`
  )
  lines.push(
    `  - data/datasources/${context.FeatureName}RemoteDataSource.ts`
  )
  lines.push(
    `  - presentation/hooks/${context.featureName}Queries.ts`
  )
  lines.push(
    `  - presentation/state/${context.featureName}Store.ts`
  )
  lines.push(`  - di.ts`)

  logger.note(lines.join('\n'), 'Dry Run')
}

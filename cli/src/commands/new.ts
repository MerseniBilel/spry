import { Command } from 'commander'
import { logger } from '../utils/logger.js'
import { pascalCase } from '../utils/string.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { ManifestReader } from '../manifest/ManifestReader.js'
import { ManifestWriter } from '../manifest/ManifestWriter.js'
import { FeatureGenerator } from '../generator/FeatureGenerator.js'
import {
  validateFeatureName,
  confirmOverwrite,
} from '../prompts/newPrompts.js'

export const newCommand = new Command('new')
  .argument('<featureName>', 'Name of the feature to create')
  .option('-y, --yes', 'Skip overwrite confirmation', false)
  .description('Create a new feature domain skeleton')
  .action(async (featureName: string, opts: { yes: boolean }) => {
    logger.intro('spry new')

    const validationError = validateFeatureName(featureName)
    if (validationError) {
      logger.error(validationError)
      process.exitCode = 1
      return
    }

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

    const manifestReader = new ManifestReader()
    const featureExists = await manifestReader.hasFeature(
      projectRoot,
      featureName
    )

    if (featureExists) {
      if (!opts.yes) {
        const confirmed = await confirmOverwrite(featureName)
        if (!confirmed) {
          logger.info('Aborted.')
          return
        }
      }
    }

    const srcRoot = `${projectRoot}/src`
    const generator = new FeatureGenerator()
    const created = await generator.generate(srcRoot, featureName)

    for (const entry of created) {
      logger.success(`Created: ${entry}`)
    }

    const manifestWriter = new ManifestWriter()
    await manifestWriter.addFeature(projectRoot, featureName)

    const pascal = pascalCase(featureName)
    const example = [
      `import { GET, PATCH, Param, Body, BaseURL, Cache } from '@spry-cli/decorators'`,
      ``,
      `@BaseURL('/api/v1')`,
      `export abstract class ${pascal}Repository {`,
      ``,
      `  @GET('/${featureName}/:id')`,
      `  @Cache(60)`,
      `  get${pascal}(@Param('id') id: string): Promise<${pascal}> { throw new Error('contract') }`,
      ``,
      `  @PATCH('/${featureName}/:id')`,
      `  update${pascal}(`,
      `    @Param('id') id: string,`,
      `    @Body() input: Update${pascal}Input`,
      `  ): Promise<${pascal}> { throw new Error('contract') }`,
      `}`,
    ].join('\n')

    logger.note(example, 'Example — add methods to your repository')

    logger.outro(
      `Run spry build ${featureName} when ready`
    )
  })

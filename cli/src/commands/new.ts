import { Command } from 'commander'
import { logger } from '../utils/logger.js'
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

    logger.outro(
      `Feature "${featureName}" created! Next: define methods in ${featureName}/domain/repositories/ then run spry build ${featureName}`
    )
  })

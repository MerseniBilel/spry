import { Command } from 'commander'
import { logger } from '../utils/logger.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { formatWithPrettier, ensurePrettierConfig } from '../utils/format.js'

export const formatCommand = new Command('format')
  .description('Format all generated feature files with Prettier')
  .action(async () => {
    logger.intro('spry format')

    const projectRoot = process.cwd()
    const configReader = new ConfigReader()
    const config = await configReader.read(projectRoot)

    if (!config) {
      logger.error('No .spryrc.json found. Run `spry init` first.')
      process.exitCode = 1
      return
    }

    await ensurePrettierConfig(projectRoot)
    formatWithPrettier(projectRoot, ['src/features/**/*.ts', 'src/features/**/*.tsx'])
    logger.outro('Formatted')
  })

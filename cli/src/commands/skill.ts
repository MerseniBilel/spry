import { Command } from 'commander'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logger } from '../utils/logger.js'
import { ConfigReader } from '../config/ConfigReader.js'
import {
  readFileContent,
  writeFileWithDir,
  fileExists,
} from '../utils/fs.js'

// Resolve to cli/src/skills/ whether running from src/ or dist/
const __thisDir = dirname(fileURLToPath(import.meta.url))
const cliRoot = join(__thisDir, '..', '..')
const SKILL_SOURCE = join(cliRoot, 'src', 'skills', 'spry', 'SKILL.md')

export const skillCommand = new Command('skill')
  .description(
    'Install the Spry skill for Claude Code in this project'
  )
  .action(async () => {
    logger.intro('spry skill')

    const projectRoot = process.cwd()
    const configReader = new ConfigReader()
    const config = await configReader.read(projectRoot)

    if (!config) {
      logger.error('No .spryrc.json found. Run `spry init` first.')
      process.exitCode = 1
      return
    }

    const destDir = join(projectRoot, '.claude', 'skills', 'spry')
    const destPath = join(destDir, 'SKILL.md')

    if (await fileExists(destPath)) {
      logger.info('Spry skill already installed. Updating...')
    }

    const content = await readFileContent(SKILL_SOURCE)
    await writeFileWithDir(destPath, content)

    logger.success('Installed .claude/skills/spry/SKILL.md')
    logger.outro(
      'Claude Code now knows how to use Spry. Try: /spry contact'
    )
  })

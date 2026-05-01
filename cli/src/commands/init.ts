import { Command } from 'commander'
import * as clack from '@clack/prompts'
import { execSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { logger } from '../utils/logger.js'
import { fileExists, writeFileWithDir } from '../utils/fs.js'
import { ConfigWriter } from '../config/ConfigWriter.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { ManifestWriter } from '../manifest/ManifestWriter.js'
import { PackageInstaller } from '../installer/PackageInstaller.js'
import { ScaffoldGenerator } from '../generator/ScaffoldGenerator.js'
import { patchTsConfig } from '../utils/tsconfig.js'
import { patchEslintConfig } from '../utils/eslint.js'
import { ensurePrettierConfig } from '../utils/format.js'
import {
  runInitPrompts,
  getDefaultChoices,
} from '../prompts/initPrompts.js'
import type {
  SpryUserChoices,
  PackageManager,
} from '../types/config.js'

function getDependencies(choices: SpryUserChoices): string[] {
  const deps = ['@spry-cli/decorators', '@tanstack/react-query']
  deps.push(choices.stateManagement === 'jotai' ? 'jotai' : 'zustand')
  if (choices.networkLayer === 'axios') deps.push('axios')
  return deps
}

function createExpoApp(options: {
  projectName: string
  cwd: string
  pm: PackageManager
}): void {
  const { projectName, cwd, pm } = options

  const runCmds: Record<PackageManager, string> = {
    npm: 'npx',
    pnpm: 'pnpm dlx',
    yarn: 'yarn dlx',
    bun: 'bunx',
  }

  execSync(
    `${runCmds[pm]} create-expo-app@latest ${projectName} --yes`,
    { cwd, stdio: 'inherit' }
  )
}

async function resolveOutputDir(
  targetDir?: string
): Promise<string> {
  if (targetDir) return resolve(targetDir)

  const envDir = process.env['INIT_CWD']
  if (envDir && (await fileExists(envDir))) return envDir

  return process.cwd()
}

export const initCommand = new Command('init')
  .description(
    'Initialize a new Spry project or configure an existing one'
  )
  .option('-y, --yes', 'Use default options (non-interactive)')
  .option(
    '-d, --dir <path>',
    'Directory to create the project in'
  )
  .action(async (options: { yes?: boolean; dir?: string }) => {
    logger.intro('spry init')

    try {
      let projectName: string
      let choices: SpryUserChoices

      const outputDir = await resolveOutputDir(options.dir)
      const installer = new PackageInstaller()
      const detectedPm = await installer.detect(outputDir)

      if (options.yes) {
        projectName = 'my-app'
        choices = getDefaultChoices()
        if (detectedPm) choices.packageManager = detectedPm
      } else {
        const result = await runInitPrompts(detectedPm)
        projectName = result.projectName
        choices = result.choices
      }
      const projectRoot = join(outputDir, projectName)

      const configReader = new ConfigReader()
      const existing = await configReader.exists(projectRoot)

      if (existing) {
        const overwrite = await clack.confirm({
          message: '.spryrc.json already exists. Overwrite?',
          initialValue: false,
        })

        if (clack.isCancel(overwrite) || !overwrite) {
          clack.cancel('Init cancelled.')
          process.exit(0)
        }
      }

      logger.info('Creating Expo project...')
      createExpoApp({
        projectName,
        cwd: outputDir,
        pm: choices.packageManager,
      })
      logger.success('Expo project created')

      const spin = clack.spinner()

      spin.start('Writing config...')
      const configWriter = new ConfigWriter()
      await configWriter.write(projectRoot, choices)
      spin.stop('Config written (.spryrc.json)')

      spin.start('Writing manifest...')
      const manifestWriter = new ManifestWriter()
      await manifestWriter.writeEmpty(projectRoot)
      spin.stop('Manifest written (.spry-manifest.json)')

      spin.start('Patching tsconfig.json...')
      const patched = await patchTsConfig(projectRoot)
      if (patched) {
        spin.stop('tsconfig.json patched (decorators enabled)')
      } else {
        spin.stop('tsconfig.json not found — skipped')
      }

      // Generate .env with API base URL placeholder
      const envPath = join(projectRoot, '.env')
      if (!(await fileExists(envPath))) {
        await writeFileWithDir(
          envPath,
          'EXPO_PUBLIC_API_URL=http://localhost:3000\n'
        )
        logger.success('.env created (set EXPO_PUBLIC_API_URL)')
      }

      const srcRoot = join(projectRoot, 'src')

      spin.start('Generating shared scaffold...')
      const scaffold = new ScaffoldGenerator()
      const created = await scaffold.generate(
        srcRoot,
        choices.networkLayer
      )
      spin.stop(`Scaffold generated (${created.length} entries)`)

      await ensurePrettierConfig(projectRoot)
      logger.success('.prettierrc created')

      spin.start('Patching ESLint config...')
      const eslintPatched = await patchEslintConfig(projectRoot)
      if (eslintPatched) {
        spin.stop('ESLint config patched (repository files excluded)')
      } else {
        spin.stop('ESLint config not found — skipped')
      }

      const deps = getDependencies(choices)

      logger.info('Installing dependencies...')
      installer.install({
        projectRoot,
        packages: deps,
        pm: choices.packageManager,
      })
      logger.success('Dependencies installed')

      logger.outro(
        `Done! cd ${projectName} and run spry new <feature>`
      )
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error'
      logger.error(`Init failed: ${message}`)
      process.exit(1)
    }
  })

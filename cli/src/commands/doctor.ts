import { Command } from 'commander'
import chalk from 'chalk'
import { logger } from '../utils/logger.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { ManifestReader } from '../manifest/ManifestReader.js'
import {
  checkConfig,
  checkManifest,
  checkTsConfig,
  checkDependencies,
  checkSharedScaffold,
  checkEslintConfig,
  checkFeature,
} from '../doctor/checks.js'
import { applyFixes } from '../doctor/fixers.js'
import type { CheckResult, FixOutcome } from '../doctor/types.js'
import type { SpryManifest } from '../types/manifest.js'

// Re-exports keep the existing test imports (`from '../../../src/commands/doctor.js'`) working.
export {
  checkConfig,
  checkManifest,
  checkTsConfig,
  checkDependencies,
  checkSharedScaffold,
  checkEslintConfig,
  checkFeature,
} from '../doctor/checks.js'
export type { CheckResult } from '../doctor/types.js'

const LINE_WIDTH = 40

function formatLine(result: CheckResult): string {
  const dots = '.'.repeat(
    Math.max(2, LINE_WIDTH - result.label.length)
  )
  const tag =
    result.status === 'pass'
      ? chalk.green('ok')
      : result.status === 'warn'
        ? chalk.yellow(result.message ?? 'warning')
        : chalk.red(result.message ?? 'FAIL')
  return `  ${result.label} ${dots} ${tag}`
}

interface RunReport {
  results: CheckResult[]
  passed: number
  warnings: number
  errors: number
}

async function runAllChecks(projectRoot: string): Promise<RunReport> {
  const results: CheckResult[] = []

  results.push(...(await checkConfig(projectRoot)))

  const configReader = new ConfigReader()
  const config = await configReader.read(projectRoot)

  results.push(...(await checkManifest(projectRoot)))
  results.push(...(await checkTsConfig(projectRoot)))
  results.push(...(await checkDependencies(projectRoot, config)))
  results.push(...(await checkSharedScaffold(projectRoot)))
  results.push(...(await checkEslintConfig(projectRoot)))

  const manifestReader = new ManifestReader()
  const manifest: SpryManifest | null =
    await manifestReader.read(projectRoot)
  const features = Object.entries(manifest?.features ?? {})

  for (const [name, data] of features) {
    results.push({
      label: `__feature_header__${name}`,
      status: 'pass',
    })
    results.push(
      ...(await checkFeature(
        projectRoot,
        name,
        data.generatedMethods
      ))
    )
  }

  let passed = 0
  let warnings = 0
  let errors = 0
  for (const r of results) {
    if (r.label.startsWith('__feature_header__')) continue
    if (r.status === 'pass') passed++
    else if (r.status === 'warn') warnings++
    else errors++
  }

  return { results, passed, warnings, errors }
}

function printReport(report: RunReport): void {
  for (const r of report.results) {
    if (r.label.startsWith('__feature_header__')) {
      const name = r.label.replace('__feature_header__', '')
      console.log('')
      console.log(`  ${chalk.bold(`Feature: ${name}`)}`)
      continue
    }
    console.log(formatLine(r))
  }
}

function printSummary(report: RunReport): void {
  const parts: string[] = []
  parts.push(chalk.green(`${report.passed} passed`))
  if (report.warnings > 0)
    parts.push(chalk.yellow(`${report.warnings} warnings`))
  if (report.errors > 0)
    parts.push(chalk.red(`${report.errors} errors`))
  console.log('')
  logger.outro(parts.join(', '))
}

function printFixOutcomes(outcomes: FixOutcome[]): void {
  console.log('')
  for (const o of outcomes) {
    const icon = o.applied
      ? chalk.green('✓')
      : o.error
        ? chalk.red('✗')
        : chalk.dim('-')
    console.log(`  ${icon} ${o.detail}`)
    if (o.error) console.log(`    ${chalk.red(o.error)}`)
  }
}

export const doctorCommand = new Command('doctor')
  .description('Validate project setup and diagnose issues')
  .option('--fix', 'Auto-repair fixable issues')
  .option(
    '--dry-run',
    'Preview repairs without writing (requires --fix)'
  )
  .action(async (opts: { fix?: boolean; dryRun?: boolean }) => {
    const projectRoot = process.cwd()
    const fix = opts.fix === true
    const dryRun = opts.dryRun === true

    if (dryRun && !fix) {
      logger.error('--dry-run requires --fix')
      process.exitCode = 1
      return
    }

    logger.intro(
      fix
        ? dryRun
          ? 'spry doctor --fix --dry-run'
          : 'spry doctor --fix'
        : 'spry doctor'
    )

    const initial = await runAllChecks(projectRoot)
    printReport(initial)

    if (!fix) {
      printSummary(initial)
      if (initial.errors > 0) process.exitCode = 1
      return
    }

    if (initial.errors === 0 && initial.warnings === 0) {
      console.log('')
      logger.success('Nothing to fix.')
      return
    }

    const configReader = new ConfigReader()
    const config = await configReader.read(projectRoot)

    console.log('')
    logger.info(dryRun ? 'Previewing fixes...' : 'Applying fixes...')

    const outcomes = await applyFixes(
      { projectRoot, config, dryRun },
      initial.results
    )

    printFixOutcomes(outcomes)

    if (dryRun) {
      const wouldFix = outcomes.filter((o) => o.detail.startsWith('[dry-run]'))
      console.log('')
      logger.outro(
        chalk.cyan(
          `Would fix ${wouldFix.length} issue${wouldFix.length === 1 ? '' : 's'}.`
        )
      )
      if (initial.errors > 0) process.exitCode = 1
      return
    }

    // Re-verify after applying fixes.
    console.log('')
    logger.info('Re-verifying...')
    console.log('')
    const finalReport = await runAllChecks(projectRoot)
    printReport(finalReport)
    printSummary(finalReport)

    if (finalReport.errors > 0) process.exitCode = 1
  })

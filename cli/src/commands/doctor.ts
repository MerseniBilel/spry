import { Command } from 'commander'
import chalk from 'chalk'
import { join } from 'node:path'
import { logger } from '../utils/logger.js'
import { fileExists, readFileContent } from '../utils/fs.js'
import { pascalCase, camelCase } from '../utils/string.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { ConfigIntegrityChecker } from '../config/ConfigIntegrityChecker.js'
import { ManifestReader } from '../manifest/ManifestReader.js'
import { RepositoryParser } from '../parser/RepositoryParser.js'
import { MethodParser } from '../parser/MethodParser.js'
import type { SpryConfig } from '../types/config.js'
import type { SpryManifest } from '../types/manifest.js'

export interface CheckResult {
  label: string
  status: 'pass' | 'warn' | 'fail'
  message?: string
}

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

// ─── Check Functions ─────────────────────────────────────────────────

export async function checkConfig(
  projectRoot: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const reader = new ConfigReader()

  const exists = await reader.exists(projectRoot)
  results.push({
    label: '.spryrc.json',
    status: exists ? 'pass' : 'fail',
    message: exists
      ? undefined
      : 'Not found. Run `spry init`',
  })

  if (exists) {
    const checker = new ConfigIntegrityChecker()
    const valid = await checker.verify(projectRoot)
    results.push({
      label: '.spryrc.json integrity',
      status: valid ? 'pass' : 'fail',
      message: valid
        ? undefined
        : 'Checksum mismatch. Run `spry init`',
    })
  }

  return results
}

export async function checkManifest(
  projectRoot: string
): Promise<CheckResult[]> {
  const reader = new ManifestReader()
  const manifest = await reader.read(projectRoot)
  return [
    {
      label: '.spry-manifest.json',
      status: manifest ? 'pass' : 'fail',
      message: manifest
        ? undefined
        : 'Not found. Run `spry init`',
    },
  ]
}

export async function checkTsConfig(
  projectRoot: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const filePath = join(projectRoot, 'tsconfig.json')

  if (!(await fileExists(filePath))) {
    results.push({
      label: 'tsconfig.json',
      status: 'fail',
      message: 'Not found',
    })
    return results
  }

  try {
    const raw = await readFileContent(filePath)
    const config = JSON.parse(raw)
    const opts = config.compilerOptions ?? {}

    results.push({
      label: 'tsconfig.json decorators',
      status: opts.experimentalDecorators === true
        ? 'pass'
        : 'fail',
      message:
        opts.experimentalDecorators === true
          ? undefined
          : 'Add experimentalDecorators: true',
    })

    const paths = opts.paths ?? {}
    const hasFeatures = !!paths['@features/*']
    const hasShared = !!paths['@shared/*']
    results.push({
      label: 'tsconfig.json path aliases',
      status: hasFeatures && hasShared ? 'pass' : 'fail',
      message:
        hasFeatures && hasShared
          ? undefined
          : 'Missing @features/* or @shared/* aliases',
    })
  } catch {
    results.push({
      label: 'tsconfig.json',
      status: 'fail',
      message: 'Invalid JSON',
    })
  }

  return results
}

export async function checkDependencies(
  projectRoot: string,
  config: SpryConfig | null
): Promise<CheckResult[]> {
  const pkgPath = join(projectRoot, 'package.json')

  if (!(await fileExists(pkgPath))) {
    return [
      {
        label: 'Dependencies',
        status: 'fail',
        message: 'package.json not found',
      },
    ]
  }

  try {
    const raw = await readFileContent(pkgPath)
    const pkg = JSON.parse(raw)
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    }

    const required = [
      '@spry-cli/decorators',
      '@tanstack/react-query',
      'zustand',
    ]
    if (config?.networkLayer === 'axios') {
      required.push('axios')
    }

    const missing = required.filter((d) => !(d in allDeps))

    if (missing.length === 0) {
      return [
        { label: 'Dependencies', status: 'pass' },
      ]
    }

    const pm = config?.packageManager ?? 'npm'
    const cmd =
      pm === 'yarn' ? 'yarn add' : `${pm} install`

    return [
      {
        label: 'Dependencies',
        status: 'warn',
        message: `Missing: ${missing.join(', ')}. Run \`${cmd} ${missing.join(' ')}\``,
      },
    ]
  } catch {
    return [
      {
        label: 'Dependencies',
        status: 'fail',
        message: 'Invalid package.json',
      },
    ]
  }
}

export async function checkSharedScaffold(
  projectRoot: string
): Promise<CheckResult[]> {
  const srcRoot = join(projectRoot, 'src')
  const checks = [
    join(srcRoot, 'shared', 'errors', 'DomainError.ts'),
    join(srcRoot, 'shared', 'http', 'httpClient.ts'),
  ]

  const missing: string[] = []
  for (const path of checks) {
    if (!(await fileExists(path))) {
      const name = path.split('/').pop() ?? path
      missing.push(name)
    }
  }

  if (missing.length === 0) {
    return [{ label: 'Shared scaffold', status: 'pass' }]
  }

  return [
    {
      label: 'Shared scaffold',
      status: 'fail',
      message: `Missing: ${missing.join(', ')}. Run \`spry init\``,
    },
  ]
}

export async function checkEslintConfig(
  projectRoot: string
): Promise<CheckResult[]> {
  const filePath = join(projectRoot, 'eslint.config.js')

  if (!(await fileExists(filePath))) {
    return [
      {
        label: 'ESLint config',
        status: 'warn',
        message: 'Not found (optional)',
      },
    ]
  }

  const content = await readFileContent(filePath)
  const hasResolver = content.includes('typescript')

  return [
    {
      label: 'ESLint config',
      status: hasResolver ? 'pass' : 'warn',
      message: hasResolver
        ? undefined
        : 'Missing typescript resolver. Run `spry init`',
    },
  ]
}

export async function checkFeature(
  projectRoot: string,
  featureName: string,
  generatedMethods: string[]
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const srcRoot = join(projectRoot, 'src')
  const featureDir = join(srcRoot, 'features', featureName)
  const pascal = pascalCase(featureName)
  const camel = camelCase(featureName)

  // Contract file
  const contractPath = join(
    featureDir,
    'domain',
    'repositories',
    `${pascal}Repository.ts`
  )
  const contractExists = await fileExists(contractPath)
  results.push({
    label: 'Repository contract',
    status: contractExists ? 'pass' : 'fail',
    message: contractExists
      ? undefined
      : `Run \`spry new ${featureName}\``,
  })

  // Generated files
  const generated = [
    join(featureDir, 'data', 'repositories', `${pascal}RepositoryImpl.ts`),
    join(featureDir, 'data', 'datasources', `${pascal}RemoteDataSource.ts`),
    join(featureDir, 'di.ts'),
    join(featureDir, 'presentation', 'hooks', `${camel}Queries.ts`),
  ]

  const missingFiles: string[] = []
  for (const path of generated) {
    if (!(await fileExists(path))) {
      missingFiles.push(path.split('/').pop() ?? path)
    }
  }

  if (missingFiles.length === 0) {
    results.push({
      label: 'Generated files',
      status: 'pass',
    })
  } else if (missingFiles.length === generated.length) {
    results.push({
      label: 'Generated files',
      status: 'fail',
      message: `Not built. Run \`spry build ${featureName}\``,
    })
  } else {
    results.push({
      label: 'Generated files',
      status: 'warn',
      message: `Missing: ${missingFiles.join(', ')}. Run \`spry build ${featureName} --force\``,
    })
  }

  // Manifest sync (drift detection)
  if (contractExists) {
    try {
      const parser = new RepositoryParser()
      const { classDecl } = parser.parse(contractPath)
      const methodParser = new MethodParser()
      const methods = methodParser.parse(classDecl)
      const contractMethods = methods.map((m) => m.name)

      const notGenerated = contractMethods.filter(
        (m) => !generatedMethods.includes(m)
      )
      const removed = generatedMethods.filter(
        (m) => !contractMethods.includes(m)
      )

      if (notGenerated.length > 0) {
        results.push({
          label: 'Manifest sync',
          status: 'warn',
          message: `New: ${notGenerated.join(', ')}. Run \`spry build ${featureName}\``,
        })
      } else if (removed.length > 0) {
        results.push({
          label: 'Manifest sync',
          status: 'warn',
          message: `Removed: ${removed.join(', ')}. Run \`spry build ${featureName} --force\``,
        })
      } else {
        results.push({
          label: 'Manifest sync',
          status: 'pass',
        })
      }
    } catch {
      results.push({
        label: 'Manifest sync',
        status: 'warn',
        message: 'Could not parse contract file',
      })
    }
  }

  return results
}

// ─── Command ─────────────────────────────────────────────────────────

export const doctorCommand = new Command('doctor')
  .description('Validate project setup and diagnose issues')
  .action(async () => {
    logger.intro('spry doctor')

    const projectRoot = process.cwd()
    let passed = 0
    let warnings = 0
    let errors = 0

    function collect(results: CheckResult[]) {
      for (const r of results) {
        console.log(formatLine(r))
        if (r.status === 'pass') passed++
        else if (r.status === 'warn') warnings++
        else errors++
      }
    }

    // Project-level checks
    collect(await checkConfig(projectRoot))

    const configReader = new ConfigReader()
    const config = await configReader.read(projectRoot)

    collect(await checkManifest(projectRoot))
    collect(await checkTsConfig(projectRoot))
    collect(await checkDependencies(projectRoot, config))
    collect(await checkSharedScaffold(projectRoot))
    collect(await checkEslintConfig(projectRoot))

    // Feature checks
    const manifestReader = new ManifestReader()
    const manifest: SpryManifest | null =
      await manifestReader.read(projectRoot)
    const features = Object.entries(
      manifest?.features ?? {}
    )

    for (const [name, data] of features) {
      console.log('')
      console.log(`  ${chalk.bold(`Feature: ${name}`)}`)
      collect(
        await checkFeature(
          projectRoot,
          name,
          data.generatedMethods
        )
      )
    }

    // Summary
    console.log('')
    const parts: string[] = []
    parts.push(chalk.green(`${passed} passed`))
    if (warnings > 0)
      parts.push(chalk.yellow(`${warnings} warnings`))
    if (errors > 0) parts.push(chalk.red(`${errors} errors`))

    if (errors > 0) {
      process.exitCode = 1
    }

    logger.outro(parts.join(', '))
  })

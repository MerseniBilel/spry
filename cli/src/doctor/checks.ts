import { join } from 'node:path'
import { fileExists, readFileContent } from '../utils/fs.js'
import { pascalCase, camelCase } from '../utils/string.js'
import { ConfigReader } from '../config/ConfigReader.js'
import { ConfigIntegrityChecker } from '../config/ConfigIntegrityChecker.js'
import { ManifestReader } from '../manifest/ManifestReader.js'
import { RepositoryParser } from '../parser/RepositoryParser.js'
import { MethodParser } from '../parser/MethodParser.js'
import type { SpryConfig } from '../types/config.js'
import type { CheckResult } from './types.js'

export async function checkConfig(
  projectRoot: string
): Promise<CheckResult[]> {
  const results: CheckResult[] = []
  const reader = new ConfigReader()

  const exists = await reader.exists(projectRoot)
  results.push({
    label: '.spryrc.json',
    status: exists ? 'pass' : 'fail',
    message: exists ? undefined : 'Not found. Run `spry init`',
    kind: exists ? undefined : 'config-missing',
  })

  if (exists) {
    const checker = new ConfigIntegrityChecker()
    const valid = await checker.verify(projectRoot)
    results.push({
      label: '.spryrc.json integrity',
      status: valid ? 'pass' : 'fail',
      message: valid ? undefined : 'Checksum mismatch',
      kind: valid ? undefined : 'config-checksum',
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
      message: manifest ? undefined : 'Not found',
      kind: manifest ? undefined : 'manifest-missing',
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
      kind: 'tsconfig-missing',
    })
    return results
  }

  try {
    const raw = await readFileContent(filePath)
    const config = JSON.parse(raw)
    const opts = config.compilerOptions ?? {}

    const decoratorsOk = opts.experimentalDecorators === true
    results.push({
      label: 'tsconfig.json decorators',
      status: decoratorsOk ? 'pass' : 'fail',
      message: decoratorsOk
        ? undefined
        : 'Add experimentalDecorators: true',
      kind: decoratorsOk ? undefined : 'tsconfig-decorators',
    })

    const paths = opts.paths ?? {}
    const featuresTargets = paths['@features/*']
    const sharedTargets = paths['@shared/*']
    const aliasesOk =
      Array.isArray(featuresTargets) &&
      featuresTargets.includes('./src/features/*') &&
      Array.isArray(sharedTargets) &&
      sharedTargets.includes('./src/shared/*')
    results.push({
      label: 'tsconfig.json path aliases',
      status: aliasesOk ? 'pass' : 'fail',
      message: aliasesOk
        ? undefined
        : 'Missing or incorrect @features/* or @shared/* aliases',
      kind: aliasesOk ? undefined : 'tsconfig-aliases',
    })
  } catch {
    results.push({
      label: 'tsconfig.json',
      status: 'fail',
      message: 'Invalid JSON',
      kind: 'tsconfig-missing',
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
        kind: 'package-json-missing',
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
      return [{ label: 'Dependencies', status: 'pass' }]
    }

    const pm = config?.packageManager ?? 'npm'
    const cmd = pm === 'npm' ? 'npm install' : `${pm} add`

    return [
      {
        label: 'Dependencies',
        status: 'warn',
        message: `Missing: ${missing.join(', ')}. Run \`${cmd} ${missing.join(' ')}\``,
        kind: 'deps-missing',
        context: { missingDeps: missing },
      },
    ]
  } catch {
    return [
      {
        label: 'Dependencies',
        status: 'fail',
        message: 'Invalid package.json',
        kind: 'package-json-invalid',
      },
    ]
  }
}

const SHARED_SCAFFOLD_FILES = [
  'shared/errors/DomainError.ts',
  'shared/http/httpClient.ts',
] as const

export async function checkSharedScaffold(
  projectRoot: string
): Promise<CheckResult[]> {
  const srcRoot = join(projectRoot, 'src')

  const missing: string[] = []
  for (const rel of SHARED_SCAFFOLD_FILES) {
    if (!(await fileExists(join(srcRoot, rel)))) {
      missing.push(rel)
    }
  }

  if (missing.length === 0) {
    return [{ label: 'Shared scaffold', status: 'pass' }]
  }

  const display = missing
    .map((p) => p.split('/').pop() ?? p)
    .join(', ')

  return [
    {
      label: 'Shared scaffold',
      status: 'fail',
      message: `Missing: ${display}`,
      kind: 'shared-scaffold',
      context: { missingScaffold: missing },
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
        kind: 'eslint-missing',
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
        : 'Missing typescript resolver',
      kind: hasResolver ? undefined : 'eslint-incomplete',
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
    kind: contractExists ? undefined : 'feature-contract',
    context: contractExists ? undefined : { featureName },
  })

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
      kind: 'feature-generated',
      context: { featureName },
    })
  } else {
    results.push({
      label: 'Generated files',
      status: 'warn',
      message: `Missing: ${missingFiles.join(', ')}. Run \`spry build ${featureName} --force\``,
      kind: 'feature-generated',
      context: { featureName },
    })
  }

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
          kind: 'feature-drift',
          context: { featureName },
        })
      } else if (removed.length > 0) {
        results.push({
          label: 'Manifest sync',
          status: 'warn',
          message: `Removed: ${removed.join(', ')}. Run \`spry build ${featureName} --force\``,
          kind: 'feature-drift',
          context: { featureName },
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

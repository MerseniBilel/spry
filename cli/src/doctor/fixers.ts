import { join } from 'node:path'
import { ConfigReader } from '../config/ConfigReader.js'
import { ConfigWriter } from '../config/ConfigWriter.js'
import { ManifestWriter } from '../manifest/ManifestWriter.js'
import { patchTsConfig } from '../utils/tsconfig.js'
import { patchEslintConfig } from '../utils/eslint.js'
import { ScaffoldGenerator } from '../generator/ScaffoldGenerator.js'
import { PackageInstaller } from '../installer/PackageInstaller.js'
import type {
  CheckResult,
  DoctorIssueKind,
  FixContext,
  FixOutcome,
} from './types.js'

const UNFIXABLE_DETAIL: Partial<Record<DoctorIssueKind, string>> = {
  'config-missing': 'Run `spry init`',
  'tsconfig-missing': 'Run `spry init` (or initialize an Expo project)',
  'package-json-missing': 'Run inside an Expo project root',
  'package-json-invalid': 'Fix package.json manually',
  'eslint-missing': 'Run `spry init`',
  'feature-contract': 'Run `spry new <feature>`',
  'feature-generated': 'Run `spry build <feature>`',
  'feature-drift': 'Run `spry build <feature>`',
}

function unfixable(
  kind: DoctorIssueKind,
  context?: { featureName?: string }
): FixOutcome {
  let detail = UNFIXABLE_DETAIL[kind] ?? 'Manual fix required'
  if (context?.featureName) {
    detail = detail.replace('<feature>', context.featureName)
  }
  return { kind, applied: false, detail }
}

export async function fixConfigChecksum(
  ctx: FixContext
): Promise<FixOutcome> {
  if (ctx.dryRun) {
    return {
      kind: 'config-checksum',
      applied: false,
      detail: '[dry-run] would rewrite .spryrc.json (recompute checksum)',
    }
  }

  const reader = new ConfigReader()
  const existing = await reader.read(ctx.projectRoot)
  if (!existing) {
    return {
      kind: 'config-checksum',
      applied: false,
      detail: '.spryrc.json not found — run `spry init`',
    }
  }

  // Strip checksum so ConfigWriter recomputes it from current choices.
  const { checksum: _ignored, ...choices } = existing
  void _ignored
  const writer = new ConfigWriter()
  await writer.write(ctx.projectRoot, choices)

  return {
    kind: 'config-checksum',
    applied: true,
    detail: 'Rewrote .spryrc.json with fresh checksum',
  }
}

export async function fixManifestMissing(
  ctx: FixContext
): Promise<FixOutcome> {
  if (ctx.dryRun) {
    return {
      kind: 'manifest-missing',
      applied: false,
      detail: '[dry-run] would create .spry-manifest.json',
    }
  }

  const writer = new ManifestWriter()
  await writer.writeEmpty(ctx.projectRoot)
  return {
    kind: 'manifest-missing',
    applied: true,
    detail: 'Created .spry-manifest.json',
  }
}

export async function fixTsConfig(
  ctx: FixContext
): Promise<FixOutcome> {
  if (ctx.dryRun) {
    return {
      kind: 'tsconfig-decorators',
      applied: false,
      detail:
        '[dry-run] would patch tsconfig.json (experimentalDecorators, @features/*, @shared/*)',
    }
  }

  const ok = await patchTsConfig(ctx.projectRoot)
  if (!ok) {
    return {
      kind: 'tsconfig-decorators',
      applied: false,
      detail: 'tsconfig.json not found — run `spry init`',
    }
  }
  return {
    kind: 'tsconfig-decorators',
    applied: true,
    detail:
      'Patched tsconfig.json (experimentalDecorators + path aliases)',
  }
}

export async function fixEslintConfig(
  ctx: FixContext
): Promise<FixOutcome> {
  if (ctx.dryRun) {
    return {
      kind: 'eslint-incomplete',
      applied: false,
      detail: '[dry-run] would patch eslint.config.js',
    }
  }

  const ok = await patchEslintConfig(ctx.projectRoot)
  if (!ok) {
    return {
      kind: 'eslint-incomplete',
      applied: false,
      detail: 'eslint.config.js not found — run `spry init`',
    }
  }
  return {
    kind: 'eslint-incomplete',
    applied: true,
    detail: 'Patched eslint.config.js',
  }
}

export async function fixSharedScaffold(
  ctx: FixContext,
  missing: string[]
): Promise<FixOutcome> {
  if (missing.length === 0) {
    return {
      kind: 'shared-scaffold',
      applied: false,
      detail: 'Nothing missing',
    }
  }

  if (!ctx.config) {
    return {
      kind: 'shared-scaffold',
      applied: false,
      detail:
        'Cannot generate scaffold — .spryrc.json missing (run `spry init`)',
    }
  }

  const display = missing.map((p) => p.split('/').pop() ?? p).join(', ')
  if (ctx.dryRun) {
    return {
      kind: 'shared-scaffold',
      applied: false,
      detail: `[dry-run] would generate: ${display}`,
    }
  }

  const generator = new ScaffoldGenerator()
  const srcRoot = join(ctx.projectRoot, 'src')
  const written = await generator.generateMissing(
    srcRoot,
    ctx.config.networkLayer,
    missing
  )

  return {
    kind: 'shared-scaffold',
    applied: written.length > 0,
    detail: `Generated: ${written.map((p) => p.split('/').pop() ?? p).join(', ')}`,
  }
}

export async function fixMissingDeps(
  ctx: FixContext,
  missing: string[]
): Promise<FixOutcome> {
  if (missing.length === 0) {
    return {
      kind: 'deps-missing',
      applied: false,
      detail: 'No missing dependencies',
    }
  }

  const installer = new PackageInstaller()
  const detected = await installer.detect(ctx.projectRoot)
  const pm = ctx.config?.packageManager ?? detected ?? 'npm'

  if (ctx.dryRun) {
    const verb = pm === 'npm' ? 'install' : 'add'
    return {
      kind: 'deps-missing',
      applied: false,
      detail: `[dry-run] would run: ${pm} ${verb} ${missing.join(' ')}`,
    }
  }

  try {
    installer.install({
      projectRoot: ctx.projectRoot,
      packages: missing,
      pm,
    })
    return {
      kind: 'deps-missing',
      applied: true,
      detail: `Installed: ${missing.join(', ')}`,
    }
  } catch (err) {
    return {
      kind: 'deps-missing',
      applied: false,
      detail: 'Dependency install failed',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ─── Orchestrator ────────────────────────────────────────────────────

export async function applyFixes(
  ctx: FixContext,
  results: CheckResult[]
): Promise<FixOutcome[]> {
  const outcomes: FixOutcome[] = []

  // Index results by kind for dispatch + dedupe.
  const byKind = new Map<DoctorIssueKind, CheckResult>()
  for (const r of results) {
    if (r.status === 'pass' || !r.kind) continue
    if (!byKind.has(r.kind)) byKind.set(r.kind, r)
  }

  if (byKind.size === 0) return outcomes

  // 1. Config checksum (must run first — later fixers consume ctx.config).
  if (byKind.has('config-checksum')) {
    outcomes.push(await fixConfigChecksum(ctx))
    if (!ctx.dryRun) {
      const reader = new ConfigReader()
      ctx.config = await reader.read(ctx.projectRoot)
    }
  }

  // 2. Manifest.
  if (byKind.has('manifest-missing')) {
    outcomes.push(await fixManifestMissing(ctx))
  }

  // 3. tsconfig (decorators + aliases collapse to one patch).
  if (
    byKind.has('tsconfig-decorators') ||
    byKind.has('tsconfig-aliases')
  ) {
    outcomes.push(await fixTsConfig(ctx))
  }

  // 4. ESLint.
  if (byKind.has('eslint-incomplete')) {
    outcomes.push(await fixEslintConfig(ctx))
  }

  // 5. Shared scaffold.
  const scaffoldResult = byKind.get('shared-scaffold')
  if (scaffoldResult) {
    const missing = scaffoldResult.context?.missingScaffold ?? []
    outcomes.push(await fixSharedScaffold(ctx, missing))
  }

  // 6. Dependencies (last — slowest, network-bound).
  const depsResult = byKind.get('deps-missing')
  if (depsResult) {
    const missing = depsResult.context?.missingDeps ?? []
    outcomes.push(await fixMissingDeps(ctx, missing))
  }

  // 7. Unfixable kinds — emit an outcome with manual instructions.
  const unfixableKinds: DoctorIssueKind[] = [
    'config-missing',
    'tsconfig-missing',
    'package-json-missing',
    'package-json-invalid',
    'eslint-missing',
    'feature-contract',
    'feature-generated',
    'feature-drift',
  ]
  for (const kind of unfixableKinds) {
    const result = byKind.get(kind)
    if (result) {
      outcomes.push(unfixable(kind, result.context))
    }
  }

  return outcomes
}

import type { SpryConfig } from '../types/config.js'

export type DoctorIssueKind =
  | 'config-missing'
  | 'config-checksum'
  | 'manifest-missing'
  | 'tsconfig-missing'
  | 'tsconfig-decorators'
  | 'tsconfig-aliases'
  | 'package-json-missing'
  | 'package-json-invalid'
  | 'deps-missing'
  | 'shared-scaffold'
  | 'eslint-missing'
  | 'eslint-incomplete'
  | 'feature-contract'
  | 'feature-generated'
  | 'feature-drift'

export interface CheckContext {
  missingDeps?: string[]
  missingScaffold?: string[]
  featureName?: string
}

export interface CheckResult {
  label: string
  status: 'pass' | 'warn' | 'fail'
  message?: string
  kind?: DoctorIssueKind
  context?: CheckContext
}

export interface FixOutcome {
  kind: DoctorIssueKind
  applied: boolean
  detail: string
  error?: string
}

export interface FixContext {
  projectRoot: string
  config: SpryConfig | null
  dryRun: boolean
}

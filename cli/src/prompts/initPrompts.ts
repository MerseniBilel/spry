import * as clack from '@clack/prompts'
import type {
  SpryUserChoices,
  PackageManager,
} from '../types/config.js'

export interface InitPromptResult {
  projectName: string
  choices: SpryUserChoices
}

function cancelAndExit(): never {
  clack.cancel('Setup cancelled.')
  process.exit(0)
}

async function askPackageManager(): Promise<PackageManager> {
  const pm = await clack.select({
    message: 'Which package manager?',
    options: [
      { value: 'npm' as const, label: 'npm' },
      { value: 'yarn' as const, label: 'yarn' },
      { value: 'pnpm' as const, label: 'pnpm' },
      { value: 'bun' as const, label: 'bun' },
    ],
  })
  if (clack.isCancel(pm)) cancelAndExit()
  return pm
}

export async function runInitPrompts(
  detectedPm: PackageManager | null
): Promise<InitPromptResult> {
  const projectName = await clack.text({
    message: 'What is your project name?',
    placeholder: 'my-app',
    validate(value: string | undefined) {
      if (!value?.trim()) return 'Project name is required'
      if (!/^[a-z0-9-]+$/.test(value)) {
        return 'Lowercase letters, numbers, and hyphens only'
      }
      return undefined
    },
  })
  if (clack.isCancel(projectName)) cancelAndExit()

  const stateManagement = await clack.select({
    message: 'Which state management?',
    options: [
      {
        value: 'zustand' as const,
        label: 'Zustand',
        hint: 'recommended',
      },
      {
        value: 'jotai' as const,
        label: 'Jotai',
      },
    ],
  })
  if (clack.isCancel(stateManagement)) cancelAndExit()

  const networkLayer = await clack.select({
    message: 'Which HTTP client?',
    options: [
      {
        value: 'fetch' as const,
        label: 'fetch',
        hint: 'zero deps',
      },
      {
        value: 'axios' as const,
        label: 'axios',
        hint: 'interceptors, auth',
      },
    ],
  })
  if (clack.isCancel(networkLayer)) cancelAndExit()

  let packageManager: PackageManager
  if (detectedPm) {
    clack.log.info(`Detected package manager: ${detectedPm}`)
    packageManager = detectedPm
  } else {
    packageManager = await askPackageManager()
  }

  return {
    projectName: projectName as string,
    choices: {
      stateManagement,
      networkLayer,
      queryClient: 'react-query',
      packageManager,
    },
  }
}

export function getDefaultChoices(): SpryUserChoices {
  return {
    stateManagement: 'zustand',
    networkLayer: 'fetch',
    queryClient: 'react-query',
    packageManager: 'npm',
  }
}

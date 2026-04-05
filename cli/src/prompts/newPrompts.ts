import * as clack from '@clack/prompts'

const FEATURE_NAME_REGEX = /^[a-z][a-z0-9-]*$/

export function validateFeatureName(name: string): string | undefined {
  if (!name.trim()) return 'Feature name is required'
  if (!FEATURE_NAME_REGEX.test(name)) {
    return 'Lowercase letters, numbers, and hyphens only (must start with a letter)'
  }
  return undefined
}

export async function confirmOverwrite(
  featureName: string
): Promise<boolean> {
  const result = await clack.confirm({
    message: `Feature "${featureName}" already exists. Overwrite?`,
    initialValue: false,
  })
  if (clack.isCancel(result)) {
    clack.cancel('Cancelled.')
    process.exit(0)
  }
  return result
}

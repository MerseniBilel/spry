import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { fileExists, writeFileWithDir } from './fs.js'

const DEFAULT_PRETTIER_CONFIG = `{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
`

export async function ensurePrettierConfig(
  projectRoot: string
): Promise<void> {
  const configPath = join(projectRoot, '.prettierrc')
  if (await fileExists(configPath)) return
  await writeFileWithDir(configPath, DEFAULT_PRETTIER_CONFIG)
}

export function formatWithPrettier(
  projectRoot: string,
  filePaths: string[]
): void {
  if (filePaths.length === 0) return
  const files = filePaths.map((f) => `"${f}"`).join(' ')
  try {
    execSync(`npx prettier --write ${files}`, {
      cwd: projectRoot,
      stdio: 'ignore',
    })
  } catch {
    // Prettier not available — skip silently
  }
}

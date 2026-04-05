import { mkdir, writeFile, readFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function ensureDir(dirPath: string): Promise<void> {
  await mkdir(dirPath, { recursive: true })
}

export async function writeFileWithDir(filePath: string, content: string): Promise<void> {
  await ensureDir(dirname(filePath))
  await writeFile(filePath, content, 'utf-8')
}

export async function readFileContent(filePath: string): Promise<string> {
  return readFile(filePath, 'utf-8')
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Returns the path to cli/src/templates regardless of whether
 * code is running from src/ (vitest/tsx) or dist/ (compiled).
 */
export function getTemplatesDir(): string {
  const thisFile = dirname(fileURLToPath(import.meta.url))
  // thisFile is either cli/src/utils or cli/dist/utils
  // Go up to cli/, then always into src/templates
  const cliRoot = join(thisFile, '..', '..')
  return join(cliRoot, 'src', 'templates')
}

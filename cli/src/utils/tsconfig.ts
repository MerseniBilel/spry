import { join } from 'node:path'
import { readFileContent, fileExists, writeFileWithDir } from './fs.js'

interface TsConfig {
  compilerOptions?: Record<string, unknown>
  [key: string]: unknown
}

export async function patchTsConfig(
  projectRoot: string
): Promise<boolean> {
  const filePath = join(projectRoot, 'tsconfig.json')
  const exists = await fileExists(filePath)

  if (!exists) return false

  const raw = await readFileContent(filePath)
  const config: TsConfig = JSON.parse(raw)

  config.compilerOptions ??= {}
  config.compilerOptions.experimentalDecorators = true
  config.compilerOptions.emitDecoratorMetadata = true

  await writeFileWithDir(filePath, JSON.stringify(config, null, 2))
  return true
}

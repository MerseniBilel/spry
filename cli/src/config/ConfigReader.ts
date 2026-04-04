import { join } from 'node:path'
import { readFileContent, fileExists } from '../utils/fs.js'
import type { SpryConfig } from '../types/config.js'

const CONFIG_FILE = '.spryrc.json'

export class ConfigReader {
  async read(projectRoot: string): Promise<SpryConfig | null> {
    const filePath = join(projectRoot, CONFIG_FILE)
    const exists = await fileExists(filePath)
    if (!exists) return null

    const content = await readFileContent(filePath)
    return JSON.parse(content) as SpryConfig
  }

  async exists(projectRoot: string): Promise<boolean> {
    return fileExists(join(projectRoot, CONFIG_FILE))
  }
}

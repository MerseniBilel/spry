import { join } from 'node:path'
import { writeFileWithDir } from '../utils/fs.js'
import { computeConfigChecksum } from '../utils/checksum.js'
import type { SpryConfig, SpryUserChoices } from '../types/config.js'

const CONFIG_FILE = '.spryrc.json'

export class ConfigWriter {
  async write(
    projectRoot: string,
    choices: SpryUserChoices
  ): Promise<SpryConfig> {
    const checksum = computeConfigChecksum(choices)
    const config: SpryConfig = { ...choices, checksum }
    const filePath = join(projectRoot, CONFIG_FILE)
    await writeFileWithDir(filePath, JSON.stringify(config, null, 2))
    return config
  }
}

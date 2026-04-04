import { ConfigReader } from './ConfigReader.js'
import { computeConfigChecksum } from '../utils/checksum.js'

export class ConfigIntegrityChecker {
  private reader = new ConfigReader()

  async verify(projectRoot: string): Promise<boolean> {
    const config = await this.reader.read(projectRoot)
    if (!config) return false

    const expected = computeConfigChecksum(config)
    return config.checksum === expected
  }
}

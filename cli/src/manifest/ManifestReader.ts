import { join } from 'node:path'
import { readFileContent, fileExists } from '../utils/fs.js'
import type { SpryManifest } from '../types/manifest.js'

const MANIFEST_FILE = '.spry-manifest.json'

export class ManifestReader {
  async read(projectRoot: string): Promise<SpryManifest | null> {
    const filePath = join(projectRoot, MANIFEST_FILE)
    const exists = await fileExists(filePath)
    if (!exists) return null

    const content = await readFileContent(filePath)
    return JSON.parse(content) as SpryManifest
  }

  async exists(projectRoot: string): Promise<boolean> {
    return fileExists(join(projectRoot, MANIFEST_FILE))
  }

  async hasFeature(
    projectRoot: string,
    featureName: string
  ): Promise<boolean> {
    const manifest = await this.read(projectRoot)
    if (!manifest) return false
    return featureName in manifest.features
  }
}

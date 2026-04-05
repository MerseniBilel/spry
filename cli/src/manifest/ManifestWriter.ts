import { join } from 'node:path'
import { writeFileWithDir } from '../utils/fs.js'
import { ManifestReader } from './ManifestReader.js'
import type { SpryManifest } from '../types/manifest.js'

const MANIFEST_FILE = '.spry-manifest.json'

export class ManifestWriter {
  private reader = new ManifestReader()

  async write(
    projectRoot: string,
    manifest: SpryManifest
  ): Promise<void> {
    const filePath = join(projectRoot, MANIFEST_FILE)
    const content = JSON.stringify(manifest, null, 2)
    await writeFileWithDir(filePath, content)
  }

  async writeEmpty(projectRoot: string): Promise<void> {
    await this.write(projectRoot, { features: {} })
  }

  async addFeature(
    projectRoot: string,
    featureName: string
  ): Promise<void> {
    const manifest = await this.reader.read(projectRoot)
    const updated: SpryManifest = manifest ?? { features: {} }
    updated.features[featureName] = { generatedMethods: [] }
    await this.write(projectRoot, updated)
  }
}

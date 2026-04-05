import { ManifestReader } from './ManifestReader.js'

export interface ManifestDiff {
  newMethods: string[]
  existingMethods: string[]
}

export class ManifestValidator {
  private reader = new ManifestReader()

  async diff(
    projectRoot: string,
    featureName: string,
    currentMethods: string[]
  ): Promise<ManifestDiff> {
    const manifest = await this.reader.read(projectRoot)
    const feature = manifest?.features[featureName]
    const generated = feature?.generatedMethods ?? []

    const generatedSet = new Set(generated)
    const newMethods = currentMethods.filter(
      (m) => !generatedSet.has(m)
    )
    const existingMethods = currentMethods.filter((m) =>
      generatedSet.has(m)
    )

    return { newMethods, existingMethods }
  }
}

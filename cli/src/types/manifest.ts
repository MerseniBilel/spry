export interface FeatureManifest {
  generatedMethods: string[]
}

export interface SpryManifest {
  features: Record<string, FeatureManifest>
}

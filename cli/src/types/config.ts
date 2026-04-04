export type NetworkLayer = 'fetch' | 'axios'
export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'

export interface SpryConfig {
  stateManagement: 'zustand'
  networkLayer: NetworkLayer
  queryClient: 'react-query'
  packageManager: PackageManager
  checksum: string
}

export type SpryUserChoices = Omit<SpryConfig, 'checksum'>

export type NetworkLayer = 'fetch' | 'axios'
export type PackageManager = 'bun' | 'pnpm' | 'yarn' | 'npm'
export type StateManagement = 'zustand' | 'jotai'

export interface SpryConfig {
  stateManagement: StateManagement
  networkLayer: NetworkLayer
  queryClient: 'react-query'
  packageManager: PackageManager
  checksum: string
}

export type SpryUserChoices = Omit<SpryConfig, 'checksum'>

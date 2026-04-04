import { createHash } from 'node:crypto'
import type { SpryConfig } from '../types/config.js'

export function computeConfigChecksum(
  config: Omit<SpryConfig, 'checksum'>
): string {
  const payload = JSON.stringify({
    stateManagement: config.stateManagement,
    networkLayer: config.networkLayer,
    queryClient: config.queryClient,
    packageManager: config.packageManager,
  })
  return createHash('sha256').update(payload).digest('hex')
}

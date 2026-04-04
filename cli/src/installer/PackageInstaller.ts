import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { fileExists } from '../utils/fs.js'
import type { PackageManager } from '../types/config.js'

interface LockfileEntry {
  file: string
  pm: PackageManager
}

const LOCKFILES: LockfileEntry[] = [
  { file: 'bun.lockb', pm: 'bun' },
  { file: 'bun.lock', pm: 'bun' },
  { file: 'pnpm-lock.yaml', pm: 'pnpm' },
  { file: 'yarn.lock', pm: 'yarn' },
  { file: 'package-lock.json', pm: 'npm' },
]

export class PackageInstaller {
  async detect(
    projectRoot: string
  ): Promise<PackageManager | null> {
    for (const { file, pm } of LOCKFILES) {
      const exists = await fileExists(join(projectRoot, file))
      if (exists) return pm
    }
    return null
  }

  install(options: {
    projectRoot: string
    packages: string[]
    pm: PackageManager
    dev?: boolean
  }): void {
    const { projectRoot, packages, pm, dev = false } = options
    if (packages.length === 0) return

    const cmd = this.buildCommand(pm, packages, dev)
    execSync(cmd, { cwd: projectRoot, stdio: 'inherit' })
  }

  private buildCommand(
    pm: PackageManager,
    packages: string[],
    dev: boolean
  ): string {
    const pkgs = packages.join(' ')
    const devFlag = this.getDevFlag(pm, dev)
    const addCmd = pm === 'npm' ? 'install' : 'add'
    const parts = [pm, addCmd, devFlag, pkgs].filter(Boolean)

    return parts.join(' ')
  }

  private getDevFlag(pm: PackageManager, dev: boolean): string {
    if (!dev) return ''
    if (pm === 'npm') return '--save-dev'
    return '-D'
  }
}

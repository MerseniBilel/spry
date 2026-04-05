#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const PACKAGES = {
  cli: join(ROOT, 'cli', 'package.json'),
  decorators: join(ROOT, 'packages', 'decorators', 'package.json'),
}

const [, , pkg, flag] = process.argv

if (!pkg || !flag || !PACKAGES[pkg] || !['--patch', '--minor', '--major'].includes(flag)) {
  console.error('Usage: node scripts/bump-version.mjs <cli|decorators> --patch | --minor | --major')
  process.exit(1)
}

const type = flag.replace('--', '')
const pkgPath = PACKAGES[pkg]
const pkgJson = JSON.parse(readFileSync(pkgPath, 'utf-8'))
const current = pkgJson.version

const [major, minor, patch] = current.split('.').map(Number)
const next =
  type === 'major' ? `${major + 1}.0.0` :
  type === 'minor' ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`

pkgJson.version = next
writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + '\n')

console.log(`${pkgJson.name}: ${current} → ${next} (${type})`)
console.log(`\nNow run:`)
console.log(`  git add -A && git commit -m "${pkgJson.name}@${next}"`)
console.log(`  git tag ${pkg === 'cli' ? 'v' : 'decorators-v'}${next}`)
console.log(`  git push && git push --tags`)

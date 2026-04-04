import { Command } from 'commander'

export const buildCommand = new Command('build')
  .argument('<featureName>', 'Name of the feature to build (or "all")')
  .option('--dry-run', 'Print what would be generated without writing')
  .option('--force', 'Regenerate all Spry-owned files from scratch')
  .description('Generate implementation files from a domain contract')
  .action(async (featureName: string, options: { dryRun?: boolean; force?: boolean }) => {
    // TODO: implement build flow
    console.log(`spry build ${featureName} — not yet implemented`)
    if (options.dryRun) console.log('(dry run mode)')
    if (options.force) console.log('(force mode)')
  })

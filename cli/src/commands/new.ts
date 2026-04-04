import { Command } from 'commander'

export const newCommand = new Command('new')
  .argument('<featureName>', 'Name of the feature to create')
  .description('Create a new feature domain skeleton')
  .action(async (featureName: string) => {
    // TODO: implement new feature scaffold
    console.log(`spry new ${featureName} — not yet implemented`)
  })

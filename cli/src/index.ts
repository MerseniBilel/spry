#!/usr/bin/env node

import { Command } from 'commander'
import { initCommand } from './commands/init.js'
import { newCommand } from './commands/new.js'
import { buildCommand } from './commands/build.js'

const program = new Command()

program
  .name('spry')
  .description('Scaffold production-ready React Native apps with Clean Architecture')
  .version('0.0.1')

program.addCommand(initCommand)
program.addCommand(newCommand)
program.addCommand(buildCommand)

program.parse()

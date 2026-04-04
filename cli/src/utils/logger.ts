import * as clack from '@clack/prompts'
import chalk from 'chalk'

export const logger = {
  intro(message: string) {
    clack.intro(chalk.bgCyan(` ${message} `))
  },

  success(message: string) {
    clack.log.success(chalk.green(message))
  },

  error(message: string) {
    clack.log.error(chalk.red(message))
  },

  info(message: string) {
    clack.log.info(message)
  },

  warn(message: string) {
    clack.log.warn(chalk.yellow(message))
  },

  outro(message: string) {
    clack.outro(message)
  },
}

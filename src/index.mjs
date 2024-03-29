#!/usr/bin/env zx

import {
  getType,
  printHelp,
  dependencyCheck,
  activateDockerMachine,
} from './lib.mjs'
import { startEnv, stopEnv, restartEnv, cleanEnv, statusEnv } from './cmds.mjs'

const main = async () => {
  $.verbose = false
  if (argv.version || argv.v) {
    const { version } = require('./../package.json')
    console.log(version)
    process.exit(0)
  }
  if (argv.verbose) {
    $.verbose = true
  }

  try {
    dependencyCheck()
    if (argv.m) {
      await activateDockerMachine()
    }
    const type = getType()

    switch (argv._[1]) {
      case 'restart':
        await restartEnv({ type })
        break
      case 'status':
        await statusEnv()
        break
      case 'ps':
        await statusEnv()
        break
      case 'start':
        await startEnv({ type })
        break
      case 'stop':
        await stopEnv({ type })
        break
      case 'clean':
        await cleanEnv()
        break
      case undefined:
        printHelp(0)
        break
      case 'help':
        printHelp(0)
        break
      default:
        console.log(`\n[${chalk.red('E')}] Command ${argv._[1]} does not exist`)
        printHelp(0)
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

await main()

#!/usr/bin/env zx

$.verbose = false

import {
  getType,
  printHelp,
  prereqCheck,
  activateDockerMachine,
} from './lib.js'

import { startEnv, stopEnv, restartEnv, cleanEnv, statusEnv } from './cmds.js'

const main = async () => {
  if (argv.version || argv.v) {
    const { version } = require('./../package.json')
    console.log(version)
    process.exit(0)
  }
  if (argv.verbose) {
    $.verbose = true
  }

  try {
    prereqCheck()
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
      case 'start':
        await startEnv({ type })
        break
      case 'stop':
        await stopEnv({ type })
        break
      case 'clean':
        await cleanEnv()
        break
      case 'help':
        printHelp(0)
      default:
        printHelp(0)
    }
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

await main()

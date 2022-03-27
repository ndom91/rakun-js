#!/usr/bin/env zx

// $.prefix = 'set -euo pipefail '

import {
  getType,
  printHelp,
  checkTmux,
  countRunningContainers,
  activateDockerMachine,
} from './lib.js'

import {
  startEnv,
  stopEnv,
  restartEnv,
  cleanEnv,
  statusEnv
} from './cmds.js'

const prereqCheck = () => {
  // Check if tmux exists
  if (!which.sync('tmux', { nothrow: true })) {
    console.log(`[${chalk.red('Error')}] Please install tmux before continuing!`)
    process.exit(1)
  }

  // Check if docker + docker-compose exists
  if (!which.sync('docker', { nothrow: true }) && !which.sync('docker-compose', { nothrow: true })) {
    console.log(`[${chalk.red('Error')}] Please install docker and docker-compose before continuing!`)
    process.exit(1)
  }
}


const main = async () => {
  if (argv['_'].length !== 2) {
    printHelp(1)
  }

  prereqCheck()
  await activateDockerMachine()
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
      await stopEnv()
      break
    case 'clean':
      await cleanEnv()
      break
    case 'help':
      printHelp(0)
    default:
      printHelp(0)
  }
}

await main()

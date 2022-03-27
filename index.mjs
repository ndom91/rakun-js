#!/usr/bin/env zx

$.prefix = ''

const printUsage = () => {
  console.log(`
    Usage:
      rakun [FLAGS] [ACTION]

    Flags:
      -m      activate docker-mmachine
      -h      docker-machine hostname

    Action:
      restart
        Restarts all running contiainers and processes.

      start
        Starts up all processes.

      stop
        Stops all running dev processes and containers

      clean
        Ensures no more processes are running.

    Options:
      --help, -h
`)
}

const parseArgs = async () => {
  if (argv['_'].length !== 2) {
    console.error('Usage: rakun [FLAGS] [ACTION]');
    printUsage()
    process.exit(1);
  }

  // Activate 'docker-machine' mode
  if (argv.m) {
    const dockerHost = process.env.DOCKER_MACHINE_NAME
      ? process.env.DOCKER_MACHINE_NAME
      : argv.h
        ? argv.h
        : 'default'

    const dockerEnv = await $`docker-machine env ${dockerHost}`

    dockerEnv.stdout
      .split('\n')
      .filter(line => line.startsWith('export'))
      .map((line) => (
        line.replaceAll('export ', '')
      ))
      .map(line => line.split('='))
      .forEach(envVar => {
        process.env[envVar[0]] = envVar[1].trim().replaceAll('"', '')
      })

    await $`env | grep DOCKER`
    await $`docker ps`
  }
  switch (argv._[1]) {
    case 'restart':
      return {
        action: 'restart',
        flags: argv
      }
    case 'status':
      console.log('\nSTATUS!')
      process.exit(0)
    case 'start':
      return {
        action: 'start',
        flags: argv
      }
    case 'stop':
      return {
        action: 'stop',
        flags: argv
      }
    case 'clean':
      return {
        action: 'clean',
        flags: argv
      }
    case 'help':
      printUsage()
      process.exit(1)
    default:
      console.error('Usage: rakun [FLAGS] [ACTION]');
      printUsage()
      process.exit(1);
  }
}

await parseArgs()

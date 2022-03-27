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

const printHelp = (code = 0) => {
  printUsage()
  process.exit(code)
}

const status = async () => {
  await $`docker ps`
}

const restart = async (opts) => {
  const { frontend, backend, all } = opts

  switch (argv._[1]) {
    case 'restart':
    default:
    // restart all
  }
  await $`docker-compose -f ${$.prefix}docker-compose.yml restart`
}

const start = async () => {
  await $`docker-compose -f ${$.prefix}docker-compose.yml up -d`
}

const stopEnv = async () => {
  await $`docker-compose -f ${$.prefix}docker-compose.yml stop`
}

const clean = async () => {
  await $`docker-compose -f ${$.prefix}docker-compose.yml down -v`
}


const parseArgs = async () => {
  if (argv['_'].length !== 2) {
    printHelp(1)
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
      .reduce((acc, line) => {
        if (line.startsWith('export')) {
          const [key, value] = line.replaceAll('export ', '').split('=')
          acc.push([key, value.trim().replaceAll('"', '')])
        }
        return acc
      }, [])
      .forEach(envVar => {
        process.env[envVar[0]] = envVar[1]
      })

  }
  switch (argv._[1]) {
    case 'restart':
      const { f: frontend = false, b: backend = false, a: all = true } = argv
      await restart({
        frontend,
        backend,
        all
      })
      break
    case 'status':
      await status()
      break
    case 'start':
      await startEnv()
      break
    case 'stop':
      await stopEnv()
      break
    case 'clean':
      await clean()
      break
    case 'help':
      printHelp(0)
    default:
      printHelp(0)
  }
}

await parseArgs()

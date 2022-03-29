const typeSchema = {
  CONTAINERS: 'CONTAINERS',
  FRONTEND: 'FRONTEND',
  BACKEND: 'BACKEND',
  ALL: 'ALL',
}

const flagsSchema = {
  [typeSchema.FRONTEND]: ['f', 'fe', 'frontend'],
  [typeSchema.BACKEND]: ['b', 'be', 'backend'],
  [typeSchema.CONTAINERS]: ['c', 'container', 'containers'],
}

const printUsage = () => {
  console.log(`
    Usage:
      ${chalk.bgGreenBright.black('  rakun  ')} [FLAGS] [ACTION]

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
      --help
`)
}

const printHelp = (code = 0) => {
  printUsage()
  process.exit(code)
}

const checkTmux = async () => {
  return (await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 0
}

const countRunningContainers = async () => {
  const containerCountProcessOutput = await nothrow(
    $`docker inspect --format="{{.State.Running}}" $(docker container ls -q --filter name=devenv*) 2>/dev/null | wc -l`,
  )
  return parseInt(containerCountProcessOutput.stdout)
}

const prereqCheck = () => {
  // Check if tmux exists
  if (!which.sync('tmux', { nothrow: true })) {
    console.log(`[${chalk.red('Error')}] Please install tmux before continuing!`)
    process.exit(1)
  }

  // Check if docker + docker-compose exists
  if (
    !which.sync('docker', { nothrow: true }) &&
    !which.sync('docker-compose', { nothrow: true })
  ) {
    console.log(
      `[${chalk.red('Error')}] Please install docker and docker-compose before continuing!`,
    )
    process.exit(1)
  }
}

const includesArg = (arr, args) => {
  return arr.some((item) => {
    if (!Array.isArray(args)) {
      return Object.keys(args).includes(item)
    } else {
      return args.includes(item)
    }
  })
}

const getType = () => {
  if (
    includesArg(flagsSchema[typeSchema.FRONTEND], argv) ||
    includesArg(flagsSchema[typeSchema.FRONTEND], argv['_'])
  ) {
    return typeSchema.FRONTEND
  } else if (
    includesArg(flagsSchema[typeSchema.BACKEND], argv) ||
    includesArg(flagsSchema[typeSchema.BACKEND], argv['_'])
  ) {
    return typeSchema.BACKEND
  } else if (
    includesArg(flagsSchema[typeSchema.CONTAINERS], argv) ||
    includesArg(flagsSchema[typeSchema.CONTAINERS], argv['_'])
  ) {
    return typeSchema.CONTAINERS
  } else {
    return typeSchema.ALL
  }
}

const getDockerMachineHost = () => {
  return process.env.DOCKER_MACHINE_NAME
    ? process.env.DOCKER_MACHINE_NAME
    : argv.h
    ? argv.h
    : 'default'
}

const activateDockerMachine = async () => {
  const dockerHost = getDockerMachineHost()
  try {
    const dockerEnv = await quiet($`docker-machine env ${dockerHost}`)

    dockerEnv.stdout
      .split('\n')
      .reduce((acc, line) => {
        if (line.startsWith('export')) {
          const [key, value] = line.replace('export ', '').split('=')
          acc.push([key, value.trim().replace('"', '').replace('"', '')])
        }
        return acc
      }, [])
      .forEach((envVar) => {
        // Set temporary env vars for docker-machine for any following docker cmds
        process.env[envVar[0]] = envVar[1]
      })
  } catch (p) {
    console.log(`[${chalk.red('E')}] Could not activate docker-machine - ${p.stderr}`)
    process.exit(1)
  }
}

const checkRunningContainers = async () => {
  try {
    const filteredOutput =
      await $`docker ps --filter name=devenv* --format="{{.Names}}" 2>/dev/null`
    const runningContainers = filteredOutput.stdout.split('\n')
    const runningContainersCount = runningContainers.filter((cont) => cont).length

    if (runningContainersCount !== 6) {
      const missingContainers = ['sqs', 'clickhouse', 'db', 'redis', 'aurora', 'kinesis'].reduce(
        (acc, containerName) => {
          if (
            runningContainers.filter((container) => {
              return container.includes(containerName)
            }).length === 0
          ) {
            acc.push(containerName)
          }
          return acc
        },
        [],
      )

      console.log(`[${chalk.red('E')}] It looks like the following containers are not running!`)
      missingContainers.forEach((container) => {
        console.log(` ${chalk.bold('*')} ${chalk.bold(container)}`)
      })
    } else {
      console.log(
        `[*] ${chalk.bold.cyan('Checkly')} docker ${chalk.green(
          '✓ ACTIVE',
        )} with ${runningContainersCount} containers.`,
      )
    }
  } catch (p) {
    console.log(`[${chalk.red('E')}] Could not check running containers - ${p.stderr}`)
    process.exit(1)
  }
}

const inRange = (x, min, max) => {
  return (x - min) * (x - max) <= 0
}

export {
  getType,
  inRange,
  printHelp,
  checkTmux,
  typeSchema,
  prereqCheck,
  getDockerMachineHost,
  activateDockerMachine,
  countRunningContainers,
  checkRunningContainers,
}

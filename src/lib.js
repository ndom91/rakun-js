
const typeSchema = {
  CONTAINERS: 'CONTAINERS',
  FRONTEND: 'FRONTEND',
  BACKEND: 'BACKEND',
  ALL: 'ALL'
}

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

const checkTmux = async () => {
  return (await $`tmux has-session -t checkly 2>/dev/null`.exitCode === 0)
}

const countRunningContainers = async () => {
  return (await $`$(docker inspect --format="{{.State.Running}}" $(docker container ls -q --filter name=devenv) 2>/dev/null | wc -l)`)
}

const getType = () => {
  if (argv.f) {
    return typeSchema.FRONTEND
  } else if (argv.b) {
    return typeSchema.BACKEND
  } else if (argv.c) {
    return typeSchema.CONTAINERS
  } else {
    return typeSchema.ALL
  }
}

const activateDockerMachine = async () => {
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
        // Set temporary env vars for docker-machine for any following docker cmds
        process.env[envVar[0]] = envVar[1]
      })
  }
}

export {
  typeSchema,
  printHelp,
  checkTmux,
  countRunningContainers,
  getType,
  activateDockerMachine
}

import { checklyDir, CONTAINER_SUBSTRINGS } from './config.mjs'
import {
  typeSchema,
  getDockerMachineHost,
  activateDockerMachine,
  getRunningContainerNames,
  checkRunningWindows,
  countRunningContainers,
} from './lib.mjs'

// @TODO:
// - Cleanup 'functions' related code

const statusEnv = async () => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 1) {
    console.log(chalk.red('No tmux session found'))
    return
  }

  let statusColoredMsg = async () => {
    const missingWindows = await checkRunningWindows()

    if (missingWindows.length === 5) {
      return chalk.red('✗ INACTIVE')
    } else if (missingWindows.length > 0) {
      return `${chalk.yellow('⚠ DEGRADED')} (without "${missingWindows.join(
        ', '
      )}")`
    } else if (missingWindows.length === 0) {
      return chalk.green('✓ ACTIVE')
    } else {
      return chalk.white('UNKNOWN')
    }
  }

  // Tmux Status
  const windowCount = parseInt(
    await $`tmux display-message -t checkly -p '#{session_windows}'`
  )
  const msg = await statusColoredMsg()
  console.log(
    `[*] ${chalk.bold.cyan('Checkly')} tmux ${msg} with ${windowCount} windows`
  )

  // Docker Status
  const localContainers = await getRunningContainerNames()
  await activateDockerMachine()
  const machineContainers = await getRunningContainerNames()
  const runningContainers = [...localContainers, ...machineContainers]

  const missingContainers = []
  for (const substring of CONTAINER_SUBSTRINGS) {
    const matchingContainers = runningContainers.filter((container) =>
      container.includes(substring)
    )

    if (matchingContainers.length === 0) {
      missingContainers.push(substring)
    }
  }

  if (missingContainers.length > 0) {
    console.log(
      `[${chalk.red(
        'E'
      )}] It looks like the following containers are not running!`
    )
    missingContainers.forEach((container) => {
      console.log(` ${chalk.bold('*')} ${chalk.bold(container)}`)
    })
  } else {
    console.log(
      `[*] ${chalk.bold.cyan('Checkly')} docker ${chalk.green(
        '✓ ACTIVE'
      )} with ${runningContainers.length} containers`
    )

    const checklyRunnerContainers = runningContainers.filter((container) =>
      container.includes('checkly-runner')
    )
    if (checklyRunnerContainers.length > 0) {
      console.log(`[*] ${chalk.bold.green('Runners')}:`)
      checklyRunnerContainers.forEach((container) => {
        console.log(` ${chalk.bold('-')} ${chalk.bold(container)}`)
      })
    }
  }
}

const restartEnv = async ({ type }) => {
  switch (type) {
    case typeSchema.FRONTEND:
      await stopEnv({ type: typeSchema.FRONTEND })
      await startEnv({ type: typeSchema.FRONTEND })
      break
    case typeSchema.BACKEND:
      await stopEnv({ type: typeSchema.BACKEND })
      await startEnv({ type: typeSchema.BACKEND })
      break
    case typeSchema.ALL:
      await stopEnv({ type: typeSchema.ALL })
      await startEnv({ type: typeSchema.ALL })
      break
    case typeSchema.SCHEDULED:
      await stopEnv({ type: typeSchema.SCHEDULED })
      await startEnv({ type: typeSchema.SCHEDULED })
      break
    case typeSchema.CONTAINERS:
      if ((await countRunningContainers()) === 0) {
        console.log(`[${chalk.yellow('W')}] No containers running on host`)
        let machineAnswer = await question(
          `[${chalk.white(
            'Q'
          )}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `
        )
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container restart $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break
    default:
      await stopEnv({ type: typeSchema.ALL })
      await startEnv({ type: typeSchema.ALL })
      break
  }
}

const startEnv = async ({ type }) => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 1) {
    await $`tmux new -s checkly -d`
  }

  switch (type) {
    case typeSchema.FRONTEND:
      await $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && fnm exec npm run serve"`
      break
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-runners/functions && fnm exec --using ../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:all-daemons:watch"`,
        $`tmux neww -t checkly: -n scheduled-workers -d "cd ${checklyDir}/checkly-backend/services/scheduled-workers && fnm exec --using ../../.nvmrc npm run start:local"`,
      ])
      break
    case typeSchema.CONTAINERS:
      if ((await countRunningContainers()) === 0) {
        console.log(`[${chalk.yellow('W')}] No containers running on host`)
        let machineAnswer = await question(
          `[${chalk.white(
            'Q'
          )}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `
        )
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container start $(docker container ls -a -q --filter name=devenv* --format '{{.ID}}') 1>/dev/null`
      break
    case typeSchema.ALL:
      await Promise.all([
        $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && fnm exec npm run serve"`,
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-runners/functions && fnm exec --using ../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:all-daemons:watch"`,
        $`tmux neww -t checkly: -n scheduled-workers -d "cd ${checklyDir}/checkly-backend/services/scheduled-workers && fnm exec --using ../../.nvmrc npm run start:local"`,
      ])
      break
    case typeSchema.SCHEDULED:
      await Promise.all([
        $`tmux neww -t checkly: -n scheduled-workers -d "cd ${checklyDir}/checkly-backend/services/scheduled-workers && fnm exec --using ../../.nvmrc npm run start:local"`,
      ])
      break
    default:
      await Promise.all([
        $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && fnm exec npm run serve"`,
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-runners/functions && fnm exec --using ../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:all-daemons:watch"`,
        $`tmux neww -t checkly: -n scheduled-workers -d "cd ${checklyDir}/checkly-backend/services/scheduled-workers && fnm exec --using ../../.nvmrc npm run start:local"`,
      ])
      break
  }
}

const stopEnv = async ({ type }) => {
  switch (type) {
    case typeSchema.FRONTEND:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:webapp &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
      ])
      break
    case typeSchema.BACKEND:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:api &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:functions &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:daemons &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:scheduled-workers &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-runners' &>/dev/null`),
      ])
      break
    case typeSchema.CONTAINERS:
      if ((await countRunningContainers()) === 0) {
        console.log(`[${chalk.yellow('W')}] No containers running on host`)
        let machineAnswer = await question(
          `[${chalk.white(
            'Q'
          )}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `
        )
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container stop $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break
    case typeSchema.ALL:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:webapp &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:api &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:functions &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:daemons &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:scheduled-workers &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-runners' &>/dev/null`),
      ])
      break
    default:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:webapp &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:api &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:functions &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:daemons &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:scheduled-workers &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-runners' &>/dev/null`),
      ])
      break
  }
}

const cleanEnv = async () => {
  await stopEnv({ type: typeSchema.ALL })
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 0) {
    nothrow(await $`tmux kill-session -t checkly`)
  }
}

export { startEnv, stopEnv, restartEnv, cleanEnv, statusEnv }

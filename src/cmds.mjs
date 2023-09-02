import { IDEAL_TMUX_WINDOWS, checklyDir } from './config.mjs'
import {
  inRange,
  typeSchema,
  getDockerMachineHost,
  activateDockerMachine,
  checkRunningContainers,
  checkRunningWindows,
  countRunningContainers,
} from './lib.mjs'

const statusEnv = async () => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 1) {
    console.log(chalk.red('No tmux session found'))
    return
  }

  let statusColoredMsg = async (num) => {
    const missingWindows = await checkRunningWindows()

    if (num === 0) {
      return chalk.red('✗ INACTIVE')
    } else if (inRange(num, 0, IDEAL_TMUX_WINDOWS - 1)) {
      return `${chalk.yellow('⚠ DEGRADED')} (without "${missingWindows.join(
        ', '
      )}")`
    } else if (num === IDEAL_TMUX_WINDOWS) {
      return chalk.green('✓ ACTIVE')
    } else if (num > IDEAL_TMUX_WINDOWS) {
      return chalk.white('UNKNOWN')
    } else {
      return chalk.white('UNKNOWN')
    }
  }

  // Tmux Status
  const windows = parseInt(
    await $`tmux display-message -t checkly -p '#{session_windows}'`
  )
  const msg = await statusColoredMsg(windows)
  console.log(
    `[*] ${chalk.bold.cyan('Checkly')} tmux ${msg} with ${windows} windows.`
  )

  // Docker Status
  if ((await countRunningContainers()) === 0) {
    console.log(`[${chalk.yellow('W')}] No containers running on host`)
    let machineAnswer = await question(
      `[${chalk.white('Q')}] Check in ${chalk.bold(
        'docker-machine'
      )}? ("${getDockerMachineHost()}") [y/n] `
    )
    if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
      await activateDockerMachine()
      checkRunningContainers()
    } else {
      process.exit(0)
    }
  } else {
    checkRunningContainers()
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
    case typeSchema.HEARTBEATS:
      await stopEnv({ type: typeSchema.HEARTBEATS })
      await startEnv({ type: typeSchema.HEARTBEATS })
      break
    case typeSchema.DATAPIPELINE:
      await stopEnv({ type: typeSchema.DATAPIPELINE })
      await startEnv({ type: typeSchema.DATAPIPELINE })
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
        $`tmux neww -t checkly: -n heartbeats -d "cd ${checklyDir}/checkly-backend/services/heartbeats-cron && fnm exec --using ../../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
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
        $`tmux neww -t checkly: -n heartbeats -d "cd ${checklyDir}/checkly-backend/services/heartbeats-cron && fnm exec --using ../../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
      ])
      break
    case typeSchema.DATAPIPELINE:
      await Promise.all([
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
      ])
      break
    case typeSchema.HEARTBEATS:
      await Promise.all([
        $`tmux neww -t checkly: -n heartbeats -d "cd ${checklyDir}/checkly-backend/services/heartbeats-cron && fnm exec --using ../../.nvmrc npm run start:local"`,
      ])
      break
    default:
      await Promise.all([
        $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && fnm exec npm run serve"`,
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-runners/functions && fnm exec --using ../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && fnm exec --using ../.nvmrc npm run start:all-daemons:watch"`,
        $`tmux neww -t checkly: -n heartbeats -d "cd ${checklyDir}/checkly-backend/services/heartbeats-cron && fnm exec --using ../../.nvmrc npm run start:local"`,
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
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
        nothrow($`tmux kill-window -t checkly:heartbeats &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-runners' &>/dev/null`),
        nothrow(
          $`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`
        ),
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
        nothrow($`tmux kill-window -t checkly:heartbeats &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-runners' &>/dev/null`),
        nothrow(
          $`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`
        ),
      ])
      break
    case typeSchema.DATAPIPELINE:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow(
          $`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`
        ),
      ])
      break
    default:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:webapp &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:api &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:functions &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:daemons &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:heartbeats &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-runners' &>/dev/null`),
        nothrow(
          $`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`
        ),
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

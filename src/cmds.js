import { checklyDir } from './config.js'
import {
  inRange,
  typeSchema,
  getDockerMachineHost,
  activateDockerMachine,
  checkRunningContainers,
  countRunningContainers,
} from './lib.js'

const statusEnv = async () => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 1) {
    console.log(chalk.red('No tmux session found'))
    return
  }

  let statusColor = (num) => {
    switch (num) {
      case 0:
        return chalk.red('✗ INACTIVE')
      case inRange(num, 1, 4):
        return chalk.yellow('⚠ DEGRADED')
      case 5:
        return chalk.green('✓ ACTIVE')
      default:
        return chalk.white('UNKNOWN')
    }
  }

  // Tmux Status
  const windows = parseInt(
    await $`tmux display-message -t checkly -p '#{session_windows}'`,
  )
  console.log(
    `${chalk.bold('[*]')} ${chalk.bold.cyan('Checkly')} tmux ${statusColor(
      windows,
    )} with ${windows} windows.`,
  )

  // Docker Status
  const containerCount = await countRunningContainers()
  if (containerCount === 0) {
    console.log(
      `[${chalk.yellow('W')}] ${chalk.red('No containers running on host')}`,
    )
    let machineAnswer = await question(
      `[${chalk.white(
        'Q',
      )}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `,
    )
    if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
      await activateDockerMachine()
      checkRunningContainers()
    } else {
      process.exit(0)
    }
  } else if (containerCount !== 6) {
    checkRunningContainers()
  }
}

const restartEnv = async ({ type }) => {
  switch (type) {
    case typeSchema.FRONTEND:
      await Promise.all([
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`,
      ])
      // START FE
      break
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`,
      ])
      // START BE
      break
    case typeSchema.ALL:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`,
      ])
      break
    case typeSchema.CONTAINERS:
      if (countRunningContainers() === 0) {
        console.log(chalk.red('No containers running'))
        let machineAnswer = await question('Check in docker-machine? [Y/N]')
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container restart $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break
    default:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`,
      ])
      break
  }
  await $`docker-compose -f ${$.prefix}docker-compose.yml restart`
}

const startEnv = async ({ type }) => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 1) {
    await $`tmux new -s checkly -d`
  }

  switch (type) {
    case typeSchema.FRONTEND:
      await $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && npm run serve"`
      break
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-lambda-runners-merge/functions && npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && npm run start:all-daemons:watch"`,
      ])
      break
    case typeSchema.CONTAINERS:
      if (countRunningContainers() === 0) {
        console.log(chalk.red('No containers running'))
        let machineAnswer = await question('Check in docker-machine? [Y/N]')
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container stop $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break
    case typeSchema.ALL:
      break
    default:
      break
  }
}

const stopEnv = async ({ type }) => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 0) {
    await $`tmux kill-session -t checkly`
  }

  switch (type) {
    case typeSchema.FRONTEND:
      await Promise.all([
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`,
      ])
      break
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`,
      ])
      break
    case typeSchema.CONTAINERS:
      if (countRunningContainers() === 0) {
        console.log(chalk.red('No containers running'))
        let machineAnswer = await question('Check in docker-machine? [Y/N]')
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container stop $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break
    case typeSchema.ALL:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`,
      ])
      break
    default:
      break
  }
}

const cleanEnv = async () => {
  await $`docker-compose -f ${$.prefix}docker-compose.yml down -v`
}

export { startEnv, stopEnv, restartEnv, cleanEnv, statusEnv }

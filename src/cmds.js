import { checklyDir } from './config.js'
import {
  inRange,
  typeSchema,
  getDockerMachineHost,
  activateDockerMachine,
  checkRunningContainers,
  checkRunningWindows,
  countRunningContainers,
} from './lib.js'

const statusEnv = async () => {
  if ((await $`tmux has-session -t checkly 2>/dev/null`.exitCode) === 1) {
    console.log(chalk.red('No tmux session found'))
    return
  }

  let statusColor = async (num) => {
    const missingWindows = await checkRunningWindows()
    let msg = ''

    console.log('NUM', num)
    switch (num) {
      case 0:
        msg = chalk.red('✗ INACTIVE')
        break
      case inRange(num, 1, 5):
        console.log('DEGRADED YALL!')
        msg = `${chalk.yellow('⚠ DEGRADED')} (without "${missingWindows.join(', ')}")`
        break
      case 6:
        msg = chalk.green('✓ ACTIVE')
        break
      case num > 6:
        console.log('GREATER YALL!')
        msg = chalk.white('UNKNOWN')
        break
      // default:
      //   console.log('DEFAULT YALL!')
      //   msg = chalk.white('UNKNOWN')
      //   break
    }
    return msg
  }

  // Tmux Status
  const windows = parseInt(await $`tmux display-message -t checkly -p '#{session_windows}'`)
  console.log(
    `[*] ${chalk.bold.cyan('Checkly')} tmux ${await statusColor(windows)} with ${windows} windows.`,
  )

  // Docker Status
  if ((await countRunningContainers()) === 0) {
    console.log(`[${chalk.yellow('W')}] No containers running on host`)
    let machineAnswer = await question(
      `[${chalk.white('Q')}] Check in ${chalk.bold(
        'docker-machine',
      )}? ("${getDockerMachineHost()}") [y/n] `,
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
    case typeSchema.DATAPIPELINE:
      await stopEnv({ type: typeSchema.DATAPIPELINE })
      await startEnv({ type: typeSchema.DATAPIPELINE })
      break
    case typeSchema.CONTAINERS:
      if ((await countRunningContainers()) === 0) {
        console.log(`[${chalk.yellow('W')}] No containers running on host`)
        let machineAnswer = await question(
          `[${chalk.white('Q')}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `,
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
      await $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && npm run serve"`
      break
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-lambda-runners-merge/functions && npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && npm run start:all-daemons:watch"`,
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
      ])
      break
    case typeSchema.CONTAINERS:
      if ((await countRunningContainers()) === 0) {
        console.log(`[${chalk.yellow('W')}] No containers running on host`)
        let machineAnswer = await question(
          `[${chalk.white('Q')}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `,
        )
        if (['y', 'Y', 'yes', 'Yes'].includes(machineAnswer)) {
          await activateDockerMachine()
        }
      }
      await $`docker container start $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break
    case typeSchema.ALL:
      await Promise.all([
        $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && npm run serve"`,
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-lambda-runners-merge/functions && npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && npm run start:all-daemons:watch"`,
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
      ])
      break
    case typeSchema.DATAPIPELINE:
      await Promise.all([
        $`tmux neww -t checkly: -n datapipeline -d "cd ${checklyDir}/checkly-data-pipeline/check-results-consumer && npm run start:local"`,
      ])
      break
    default:
      await Promise.all([
        $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && npm run serve"`,
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-lambda-runners-merge/functions && npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && npm run start:all-daemons:watch"`,
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
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`),
      ])
      break
    case typeSchema.CONTAINERS:
      if ((await countRunningContainers()) === 0) {
        console.log(`[${chalk.yellow('W')}] No containers running on host`)
        let machineAnswer = await question(
          `[${chalk.white('Q')}] Check in docker-machine? ("${getDockerMachineHost()}") [y/n] `,
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
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`),
      ])
      break
    case typeSchema.DATAPIPELINE:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`),
      ])
      break
    default:
      await Promise.all([
        nothrow($`tmux kill-window -t checkly:webapp &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:api &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:functions &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:daemons &>/dev/null`),
        nothrow($`tmux kill-window -t checkly:datapipeline &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`),
        nothrow($`pkill -f 'node daemons/' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`),
        nothrow($`pkill -f 'node /opt/checkly/checkly-data-pipeline' &>/dev/null`),
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

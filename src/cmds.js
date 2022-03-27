import { checklyDir } from './config.js'
import { typeSchema } from './lib.js'

const statusEnv = async () => {
  await $`docker ps`
}

const restartEnv = async ({ type }) => {
  switch (type) {
    case typeSchema.FRONTEND:
      await Promise.all([
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`
      ])
      break;
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`
      ])
      break;
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
      break;
    case typeSchema.CONTAINERS:
      await $`docker container restart $(docker container ls -a -q --filter name=devenv*) 1>/dev/null`
      break;
    default:
      await Promise.all([
        $`tmux kill-window -t checkly:api &>/dev/null`,
        $`tmux kill-window -t checkly:functions &>/dev/null`,
        $`tmux kill-window -t checkly:daemons &>/dev/null`,
        $`tmux kill-window -t checkly:webapp &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-webapp' &>/dev/null`,
        $`pkill -f 'node daemons/' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-backend' &>/dev/null`,
        $`pkill -f 'node /opt/checkly/checkly-lambda-runners-merge' &>/dev/null`
      ])
      break;
  }
  await $`docker-compose -f ${$.prefix}docker-compose.yml restart`
}

const startEnv = async ({ type }) => {

  if (await $`tmux has-session -t checkly 2>/dev/null`.exitCode === 1) {
    await $`tmux new -s checkly -d`
  }

  switch (type) {
    case typeSchema.FRONTEND:
      await $`tmux neww -t checkly: -n webapp -d "cd ${checklyDir}/checkly-webapp && npm run serve"`
      break;
    case typeSchema.BACKEND:
      await Promise.all([
        $`tmux neww -t checkly: -n api -d "cd ${checklyDir}/checkly-backend/api && npm run start:watch"`,
        $`tmux neww -t checkly: -n functions -d "cd ${checklyDir}/checkly-lambda-runners-merge/functions && npm run start:local"`,
        $`tmux neww -t checkly: -n daemons -d "cd ${checklyDir}/checkly-backend/api && npm run start:all-daemons:watch"`
      ])
      break;
    case typeSchema.CONTAINERS:
      break;
    case typeSchema.ALL:
      break;
    default:
      break;
  }
}

const stopEnv = async () => {
  switch (type) {
    case typeSchema.FRONTEND:
      break;
    case typeSchema.BACKEND:
      break;
    case typeSchema.CONTAINERS:
      await $`docker-compose -f ${$.prefix}docker-compose.yml stop`
      break;
    case typeSchema.ALL:
      break;
    default:
      break;
  }
}

const cleanEnv = async () => {
  await $`docker-compose -f ${$.prefix}docker-compose.yml down -v`
}

export {
  startEnv,
  stopEnv,
  restartEnv,
  cleanEnv,
  statusEnv
}

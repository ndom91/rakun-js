# Rakun 🦝

Experimental js cli for managing my local development environment

## Getting Started 🚀

You can either download the `latest` release from the [releases](https://github.com/ndom91/rakun/releases) tab, or install the repo via `npm`.

```bash
$ npm install https://github.com/ndom91/rakun
```

Once installed, the cli can be used via the common pattern of `rakun [FLAGS] [ACTION]`, like the following examples.

```bash
$ rakun --help
$ rakun restart
$ rakun -m -h ndo-docker status
```

## Options 🕹️

```bash
  FLAGS:
    -m [BOOL]        use docker-machine
    -h [STRING]      docker-machine hostname
    -cd              checkly directory

  ACTIONS:
    help, -h         display this help output
    status           show current status of tmux window and containers

    start            start all development processes
      frontend, -f   start frontend only
      backend, -b    start backend only
      containers, -c start containers only
    restart          restart running development processes
      frontend, -f   restart frontend only
      backend, -b    restart backend only
      containers, -c restart containers only
    stop             stop and kill any running processes
      frontend, -f   stop frontend only
      backend, -b    stop backend only
      containers, -c stop containers only

    clean            ensure no development processes or containers are left running
```

## Contributing 🫠

Please stick to any formatting settings and if you have question or comments you can open an issue [here](https://github.com/ndom91/rakun/issues/new).

## License 📜

MIT

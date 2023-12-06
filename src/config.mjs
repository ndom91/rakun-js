export const checklyDir = argv.cd ?? '/opt/checkly'
export const IDEAL_CONTAINER_COUNT = 7
export const CONTAINER_SUBSTRINGS = [
  'sqs',
  'clickhouse',
  'prometheus',
  'db',
  'redis',
  'aurora',
  'kinesis',
]

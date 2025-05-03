import * as process from 'node:process'

function getTimestamp() {
  const hrTime = process.hrtime()
  return hrTime[0] * 1000 + hrTime[1] / 1000000
}

export async function stopwatch(task: () => Promise<void>) {
  const startTime = getTimestamp()
  await task()

  return getTimestamp() - startTime
}

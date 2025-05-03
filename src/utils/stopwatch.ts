import * as process from 'node:process'

function getTimestamp() {
  const hrTime = process.hrtime()
  return hrTime[0] * 1000 + hrTime[1] / 1000000
}

export async function stopwatch<T>(
  task: () => Promise<T>,
): Promise<[number, T]> {
  const startTime = getTimestamp()
  const result = await task()

  return [getTimestamp() - startTime, result]
}

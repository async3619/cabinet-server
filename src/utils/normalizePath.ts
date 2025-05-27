import * as path from 'node:path'

export function normalizePath(targetPath: string): string {
  return path.isAbsolute(targetPath)
    ? targetPath
    : path.join(process.cwd(), targetPath)
}

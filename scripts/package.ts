import * as glob from 'fast-glob'
import * as fs from 'fs-extra'

import * as path from 'path'
import * as process from 'process'

export type CopyTarget = string | { dstName: string; srcName: string }

const LIB_PATH = path.join(process.cwd(), 'lib')
const filesToCopy: CopyTarget[] = [
  {
    dstName: 'README.md',
    srcName: 'LIBRARY.md',
  },
]

export async function preparePackage() {
  if (!fs.existsSync(LIB_PATH)) {
    throw new Error(
      "`./lib` directory does not exist. Did you run 'pnpm package' first?",
    )
  }

  const targetFiles = filesToCopy
    .map<Exclude<CopyTarget, string>>((file) =>
      typeof file === 'string'
        ? {
            srcName: path.join(process.cwd(), file),
            dstName: path.join(LIB_PATH, file),
          }
        : {
            srcName: path.join(process.cwd(), file.srcName),
            dstName: path.join(LIB_PATH, file.dstName),
          },
    )
    .filter(({ srcName }) => fs.existsSync(srcName))

  await Promise.all(
    targetFiles.map(({ srcName, dstName }) =>
      fs.copy(srcName, path.join(LIB_PATH, path.basename(dstName))),
    ),
  )

  // eslint-disable-next-line no-restricted-modules
  const rootPackage = require('../package.json')
  const { name, version, author, repository, license } = rootPackage

  const codeFilePaths = await glob.async('**/*.{js,ts,d.ts}', {
    cwd: LIB_PATH,
  })

  const libraries = new Map<string, string>()
  for (const filePath of codeFilePaths) {
    const fullPath = path.join(LIB_PATH, filePath)
    const content = fs.readFileSync(fullPath, 'utf-8')
    const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g

    let match: RegExpExecArray | null
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1]
      const version =
        rootPackage.dependencies?.[importPath] ??
        rootPackage.devDependencies?.[importPath]

      if (!version) {
        continue
      }

      libraries.set(importPath, version)
    }
  }

  const libPackage = {
    name,
    description:
      'Set of types to develop typescript based applications on top of Cabinet Server',
    version,
    author,
    repository,
    license,
    main: 'types.js',
    types: 'types.d.ts',
    files: await glob.async('**/*', { cwd: LIB_PATH }),
    dependencies: Object.fromEntries(libraries),
  }

  await fs.writeFile(
    path.join(LIB_PATH, 'package.json'),
    JSON.stringify(libPackage, null, 2),
    'utf-8',
  )
}

preparePackage().then()

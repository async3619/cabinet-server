import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/types.ts'],
  outDir: './lib',
  platform: 'node',
  format: 'cjs',
  sourcemap: false,
  clean: true,
  dts: true,
})

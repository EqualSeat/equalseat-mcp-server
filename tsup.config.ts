import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  ...options,
  entry: ['src/index.ts'],
  format: ['cjs'],
  target: 'node18',
  outDir: 'build',
  clean: true,
  sourcemap: true,
  noExternal: [/.*/],
}));

import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  ...options,
  entry: ['src/cli.ts'],
  format: ['cjs'],
  target: 'node20',
  outDir: 'build',
  clean: true,
  sourcemap: true,
  banner: { js: '#!/usr/bin/env node' },
  noExternal: [/.*/],
}));

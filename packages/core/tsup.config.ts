import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'locales/en': 'src/locales/en.ts',
    'locales/he': 'src/locales/he.ts',
    'locales/es': 'src/locales/es.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-hook-form', 'zod'],
})

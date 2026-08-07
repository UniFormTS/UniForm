import { writeFileSync } from 'node:fs'

// Types-only subpath: gives `.meta()` autocomplete without importing the
// library at runtime. Mirrors src/zod-augmentation.d.ts against the built types.
const contents = `import type { FieldMetaBase } from './index'

// zod@3.25+ — import from 'zod/v4'
declare module 'zod/v4/core' {
  interface GlobalMeta extends FieldMetaBase {}
}

// zod@4.x — import from 'zod'
declare module 'zod' {
  interface GlobalMeta extends FieldMetaBase {}
}

export {}
`

writeFileSync(
  new URL('../dist/zod-augmentation.d.ts', import.meta.url),
  contents,
  'utf8',
)

# 10 — Zod `.meta()` augmentation

## Problem

Users should get autocomplete and type checking for UniForm's keys in `z.string().meta({ ... })` without relying on a bare side-effect import of the package.

## API

A types-only subpath export:

```json
"exports": {
  "./zod-augmentation": { "types": "./dist/zod-augmentation.d.ts" }
}
```

Enabled with either:

```ts
/// <reference types="@uniform-ts/core/zod-augmentation" />
// or
import type {} from '@uniform-ts/core/zod-augmentation'
```

It augments Zod's `GlobalMeta` with UniForm's `FieldMetaBase`.

## Requirements

- The published `.d.ts` is **generated during `build`** from the source augmentation file (rewriting its internal import to the package's own types entry). Do not hand-copy the declaration into a script — the two drift.
- Watch mode (`dev`) regenerates it too (e.g. tsup `onSuccess`).
- Build-time only: never write outside the package's own `dist/`, no `postinstall`.
- Consider a `typesVersions` entry for consumers on `moduleResolution: node10`, which ignore `exports`.
- **Type test.** A fixture compiled with a dedicated `tsconfig` asserts, via `@ts-expect-error`, that a known key with the wrong type fails (e.g. `span: 'wide'` — `span` is a number). Plain unknown keys cannot be tested this way because `GlobalMeta` has an index signature.
- Add a `test:types` script and run it in CI **after** the build step (it resolves against `dist/`).
- Installation docs explain both ways to enable it and that no bare side-effect import is needed.

## Acceptance

- `pnpm build` produces `dist/zod-augmentation.d.ts`.
- `pnpm --filter @uniform-ts/core test:types` passes, and fails if the augmentation is removed.
- CI runs the type test.

---
title: Installation
sidebar_position: 4
---

# Installation

## Package Manager

Install `@uniform-ts/core` along with its peer dependencies:

```bash npm2yarn
npm install @uniform-ts/core react react-hook-form zod
```

:::note Zod V4 import path
UniForm requires the Zod V4 API. How you import it depends on which version of the `zod` package you have installed:

- **`zod@3.25` or later** — Zod V4 ships inside the existing `zod` package. Import from the sub-path:
  ```ts
  import { z } from 'zod/v4'
  ```
- **`zod@4.x`** — Import directly from the package root:
  ```ts
  import { z } from 'zod'
  ```
  :::

## Imports

Everything you need is exported from `@uniform-ts/core`:

```ts
import { createForm, AutoForm, createAutoForm } from '@uniform-ts/core'
import type { FieldProps, AutoFormHandle } from '@uniform-ts/core'
```

### You do **not** need a bare side-effect import

```ts
import '@uniform-ts/core' // ❌ delete this
```

UniForm's Zod `.meta()` autocomplete comes from a **type-only** module augmentation, which TypeScript applies as soon as anything in the file graph imports from the package — including `import type`. A bare runtime import does nothing except pull the whole library into that entry chunk, even on routes that never render a form.

If you want `.meta()` autocomplete in a module that does not otherwise reference UniForm — a schema-only file, for instance — reference the types-only subpath instead. It has **zero** runtime cost:

```ts
/// <reference types="@uniform-ts/core/zod-augmentation" />
```

Put it in `vite-env.d.ts` (or any ambient `.d.ts`) to apply it project-wide.

The package is marked `sideEffects: false`, so bundlers tree-shake everything you do not import.

## TypeScript Configuration

UniForm requires TypeScript with `strict` mode and `moduleResolution: bundler` (or `node16` / `nodenext`). In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "jsx": "react-jsx"
  }
}
```

## Peer Dependencies

| Package           | Version            |
| ----------------- | ------------------ |
| `react`           | `^19.0.0`          |
| `react-hook-form` | `^7.0.0`           |
| `zod`             | `^3.25.0` (Zod V4) |

## AI Agent Skill

If you build forms with an AI coding assistant (Copilot, Claude, etc.), install the UniForm skill so it follows the idiomatic, schema-first patterns:

```bash
npx skills add https://github.com/UniFormTS/UniForm --skill uniform-best-practices
```

The skill is also discoverable on [skills.sh](https://skills.sh/UniFormTS/UniForm).

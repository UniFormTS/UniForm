---
title: Installation
sidebar_position: 4
---

# Installation

## Package Manager

Install `@uniform-dev/core` along with its peer dependencies:

```bash npm2yarn
npm install @uniform-dev/core react react-hook-form zod
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

Everything you need is exported from `@uniform-dev/core`:

```ts
import { createForm, AutoForm, createAutoForm } from '@uniform-dev/core'
import type { FieldProps, AutoFormHandle } from '@uniform-dev/core'
```

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

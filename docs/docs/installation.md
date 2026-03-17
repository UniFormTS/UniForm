---
title: Installation
sidebar_position: 4
---

# Installation

## Package Manager

Install `@uniform/core` along with its peer dependencies:

```bash npm2yarn
npm install @uniform/core react react-hook-form zod
```

:::note Zod V4 import path
UniForm uses Zod V4, which ships under the `zod@^3.25` version range. Import from `'zod/v4'` to get the V4 API surface:

```ts
import { z } from 'zod/v4'
```
:::

## Imports

Everything you need is exported from `@uniform/core`:

```ts
import { createForm, AutoForm, createAutoForm } from '@uniform/core'
import type { FieldProps, AutoFormHandle } from '@uniform/core'
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

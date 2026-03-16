---
title: Installation
sidebar_position: 2
---

# Installation

## Package Manager

Install `@uniform/core` along with its peer dependencies:

```bash npm2yarn
npm install @uniform/core react react-hook-form zod
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

## Build Output

The package ships:

| Format | Entry                                  |
| ------ | -------------------------------------- |
| ESM    | `dist/index.mjs`                       |
| CJS    | `dist/index.js`                        |
| Types  | `dist/index.d.ts` / `dist/index.d.mts` |

Both outputs are tree-shakeable (`"sideEffects": false`).

## Peer Dependencies

| Package           | Version            |
| ----------------- | ------------------ |
| `react`           | `^19.0.0`          |
| `react-hook-form` | `^7.0.0`           |
| `zod`             | `^3.25.0` (Zod V4) |

:::note
Zod V4 ships under the `zod@^3.25` version range. Import from `'zod/v4'` for the V4 API surface.
:::

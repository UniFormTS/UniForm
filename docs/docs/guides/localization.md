---
title: Localization
sidebar_position: 7
---

# Localization

UniForm ships with built-in locale packs as separate subpath exports. Only the locale you import ends up in your bundle — unused locales are never loaded.

## Using a locale pack

```tsx
import { es } from '@uniform-ts/core/locales/es'
import { AutoForm } from '@uniform-ts/core'

<AutoForm form={myForm} labels={es} onSubmit={handleSubmit} />
```

## Available locales

| Import path                        | Language |
| ---------------------------------- | -------- |
| `@uniform-ts/core/locales/en`      | English  |
| `@uniform-ts/core/locales/he`      | Hebrew   |
| `@uniform-ts/core/locales/es`      | Spanish  |

## Overriding individual keys

Locale packs are plain objects — spread them and override any key you need:

```tsx
import { es } from '@uniform-ts/core/locales/es'

<AutoForm labels={{ ...es, submit: 'Guardar cambios' }} ... />
```

## Factory-level locale

Set a locale once in `createAutoForm` so every form instance inherits it:

```tsx
import { createAutoForm } from '@uniform-ts/core'
import { he } from '@uniform-ts/core/locales/he'

const AutoForm = createAutoForm({ labels: he })
```

Per-instance `labels` props are shallow-merged on top, so individual forms can still override specific keys.

## `FormLabels` reference

All keys are optional. Any key you omit falls back to the English default.

| Key                   | Type                         | Default                          | Description                              |
| --------------------- | ---------------------------- | -------------------------------- | ---------------------------------------- |
| `submit`              | `string`                     | `"Submit"`                       | Submit button text                       |
| `arrayAdd`            | `string`                     | `"Add"`                          | Add-row button text                      |
| `arrayRemove`         | `string`                     | `"Remove"`                       | Remove-row button text                   |
| `arrayMoveUp`         | `string`                     | `"↑"`                            | Move-up button text                      |
| `arrayMoveDown`       | `string`                     | `"↓"`                            | Move-down button text                    |
| `arrayDuplicate`      | `string`                     | `"Duplicate"`                    | Duplicate-row button text                |
| `arrayCollapse`       | `string`                     | `"▼"`                            | Collapse toggle (row is expanded)        |
| `arrayExpand`         | `string`                     | `"▶"`                            | Expand toggle (row is collapsed)         |
| `arrayItemSummary`    | `(index: number) => string`  | `` `Item ${n}` ``                | Collapsed row fallback label             |
| `arrayAriaExpand`     | `(index: number) => string`  | `` `Expand item ${n}` ``         | Aria label for the expand toggle         |
| `arrayAriaCollapse`   | `(index: number) => string`  | `` `Collapse item ${n}` ``       | Aria label for the collapse toggle       |
| `arrayAriaMoveUp`     | `(index: number) => string`  | `` `Move item ${n} up` ``        | Aria label for the move-up button        |
| `arrayAriaMoveDown`   | `(index: number) => string`  | `` `Move item ${n} down` ``      | Aria label for the move-down button      |
| `arrayAriaDuplicate`  | `(index: number) => string`  | `` `Duplicate item ${n}` ``      | Aria label for the duplicate button      |
| `arrayAriaRemove`     | `(index: number) => string`  | `` `Remove item ${n}` ``         | Aria label for the remove button         |

## Adding a custom locale

A locale is just a `FormLabels` object — create one for any language:

```ts
import type { FormLabels } from '@uniform-ts/core'

export const fr: FormLabels = {
  submit: 'Envoyer',
  arrayAdd: 'Ajouter',
  arrayRemove: 'Supprimer',
  arrayMoveUp: '↑',
  arrayMoveDown: '↓',
  arrayDuplicate: 'Dupliquer',
  arrayCollapse: '▼',
  arrayExpand: '▶',
  arrayItemSummary: (i) => `Élément ${i + 1}`,
  arrayAriaExpand: (i) => `Développer l'élément ${i + 1}`,
  arrayAriaCollapse: (i) => `Réduire l'élément ${i + 1}`,
  arrayAriaMoveUp: (i) => `Déplacer l'élément ${i + 1} vers le haut`,
  arrayAriaMoveDown: (i) => `Déplacer l'élément ${i + 1} vers le bas`,
  arrayAriaDuplicate: (i) => `Dupliquer l'élément ${i + 1}`,
  arrayAriaRemove: (i) => `Supprimer l'élément ${i + 1}`,
}
```

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

;<AutoForm form={myForm} labels={es} onSubmit={handleSubmit} />
```

## Available locales

| Import path                   | Language |
| ----------------------------- | -------- |
| `@uniform-ts/core/locales/en` | English  |
| `@uniform-ts/core/locales/he` | Hebrew   |
| `@uniform-ts/core/locales/es` | Spanish  |

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

| Key                  | Type                        | Default                     | Description                         |
| -------------------- | --------------------------- | --------------------------- | ----------------------------------- |
| `submit`             | `string`                    | `"Submit"`                  | Submit button text                  |
| `arrayAdd`           | `string`                    | `"Add"`                     | Add-row button text                 |
| `arrayRemove`        | `string`                    | `"Remove"`                  | Remove-row button text              |
| `arrayMoveUp`        | `string`                    | `"↑"`                       | Move-up button text                 |
| `arrayMoveDown`      | `string`                    | `"↓"`                       | Move-down button text               |
| `arrayDuplicate`     | `string`                    | `"Duplicate"`               | Duplicate-row button text           |
| `arrayCollapse`      | `string`                    | `"▼"`                       | Collapse toggle (row is expanded)   |
| `arrayExpand`        | `string`                    | `"▶"`                       | Expand toggle (row is collapsed)    |
| `arrayItemSummary`   | `(index: number) => string` | `` `Item ${n}` ``           | Collapsed row fallback label        |
| `arrayAriaExpand`    | `(index: number) => string` | `` `Expand item ${n}` ``    | Aria label for the expand toggle    |
| `arrayAriaCollapse`  | `(index: number) => string` | `` `Collapse item ${n}` ``  | Aria label for the collapse toggle  |
| `arrayAriaMoveUp`    | `(index: number) => string` | `` `Move item ${n} up` ``   | Aria label for the move-up button   |
| `arrayAriaMoveDown`  | `(index: number) => string` | `` `Move item ${n} down` `` | Aria label for the move-down button |
| `arrayAriaDuplicate` | `(index: number) => string` | `` `Duplicate item ${n}` `` | Aria label for the duplicate button |
| `arrayAriaRemove`    | `(index: number) => string` | `` `Remove item ${n}` ``    | Aria label for the remove button    |

## Validation messages are a separate layer

`labels` covers UniForm's own UI strings. **Validation messages come from Zod**, and there is deliberately only one source for them:

1. The message you pass in the schema — `z.string().min(1, 'Name is required')`.
2. Otherwise, whatever Zod's configured locale produces — including a global `z.config({ localeError })`.

UniForm's `messages` prop is a **targeted override on top of that result**, not a parallel message system. Use it only for per-form exceptions; anything you do not list falls through to Zod untouched.

```ts
import * as z from 'zod/v4'
import { he } from 'zod/v4/locales'

// One place for every validation message, app-wide:
z.config(he())

// UniForm adds no second system — `messages` is only for exceptions:
<AutoForm form={myForm} messages={{ vatNumber: 'מספר עוסק לא תקין' }} ... />
```

See the [Validation guide](./validation#resolution-order) for the exact precedence.

## RTL and Hebrew

Right-to-left works with no special support: import the `he` locale pack for UniForm's UI strings, set `z.config(he())` for validation messages, and set `dir="rtl"` on a wrapping element (or `<html>`). UniForm renders no directional styling of its own, so the browser handles the rest.

```tsx
import { he } from '@uniform-ts/core/locales/he'

;<div dir='rtl'>
  <AutoForm form={myForm} labels={he} onSubmit={save} />
</div>
```

This path is confirmed working in production by an adopter shipping a Hebrew RTL ERP.

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

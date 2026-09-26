---
title: useArrayField()
sidebar_position: 4
---

# `useArrayField()`

`useArrayField(fieldName)` gives you reactive state and mutation helpers for a specific array field from anywhere inside an `<AutoForm>` subtree.

It is ideal when you want array controls outside the default array field layout (toolbars, section headers, sticky footers, custom wrappers).

```tsx
import { useArrayField } from '@uniform-ts/core'

function LineItemsToolbar() {
  const { append, canAdd, rowCount } = useArrayField('lineItems')

  return (
    <button
      type='button'
      disabled={!canAdd}
      onClick={() => append({ description: '', qty: 1, unitPrice: 0 })}
    >
      + Add line item ({rowCount})
    </button>
  )
}
```

## Signature

```ts
function useArrayField(fieldName: string): UseFieldArrayReturn & {
  rowCount: number
  canAdd: boolean
  atMin: boolean
}
```

## Parameters

| Name        | Type     | Description                                                                                         |
| ----------- | -------- | --------------------------------------------------------------------------------------------------- |
| `fieldName` | `string` | Dot-notated array field path (for example `"lineItems"`, `"profile.contacts"`, `"groups.0.emails"`) |

## Returns

`useArrayField` returns all standard [`useFieldArray`](https://react-hook-form.com/docs/usefieldarray) members for that field, including:

- `fields`
- `append`
- `prepend`
- `insert`
- `remove`
- `swap`
- `move`
- `update`
- `replace`

And it adds UniForm-specific derived flags:

| Name       | Type      | Meaning                                              |
| ---------- | --------- | ---------------------------------------------------- |
| `rowCount` | `number`  | Current number of rows in the array                  |
| `canAdd`   | `boolean` | `false` when Zod `.max(...)` is reached              |
| `atMin`    | `boolean` | `true` when row count is at or below Zod `.min(...)` |

`canAdd` and `atMin` are computed from the introspected array field config, so they stay aligned with schema min/max constraints.

## How operations are applied

- **Array rendered** — the operations drive the array renderer's own field array, so rows update in the DOM immediately and rows added with the built-in buttons are reflected in `rowCount` and `fields`.
- **Array not rendered** (for example `hidden`, or replaced by a component override) — the operations write the whole array value with `setValue`. Each call reads the current array at call time, so two `append` calls in one handler both land.

Either way, per-row overrides set with `ctx.setFieldMeta('<array>.<index>.<field>', …)` follow their rows (see [Array Fields](../guides/arrays#per-row-overrides-follow-their-row)).

Arrays of primitives are supported: `append('new tag')`.

## Requirements

- Must be called from a component rendered under `<AutoForm>`.
- `fieldName` should point to an array field in the schema. Otherwise the hook logs a warning once and `canAdd` / `atMin` fall back to unconstrained values.

## Example: external toolbar + hidden built-in Add button

```tsx
import * as z from 'zod/v4'
import {
  AutoForm,
  createForm,
  useArrayField,
  type FormWrapperProps,
  type ArrayFieldLayoutProps,
} from '@uniform-ts/core'

const schema = z.object({
  client: z.string().min(1),
  lineItems: z.array(z.object({ description: z.string().min(1) })).min(1).max(5),
})

const form = createForm(schema)

function Toolbar() {
  const { append, canAdd, rowCount } = useArrayField('lineItems')
  return (
    <button
      type='button'
      disabled={!canAdd}
      onClick={() => append({ description: '' })}
    >
      + Add item ({rowCount}/5)
    </button>
  )
}

const FormWithToolbar = ({ children }: FormWrapperProps) => (
  <>
    <Toolbar />
    {children}
  </>
)

const RowsOnly = ({ rows }: ArrayFieldLayoutProps) => <>{rows}</>

<AutoForm
  form={form}
  defaultValues={{ client: '', lineItems: [{ description: '' }] }}
  layout={{
    formWrapper: FormWithToolbar,
    arrayFieldLayout: RowsOnly,
  }}
  onSubmit={console.log}
/>
```

See also: [Array Fields guide](../guides/arrays) and [TypeScript API](./types).

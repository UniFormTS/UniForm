---
title: useArrayField()
sidebar_position: 4
---

# `useArrayField()`

`useArrayField(fieldName)` gives you reactive state and mutation helpers for a specific array field from anywhere inside an `<AutoForm>` subtree.

It is ideal when you want array controls outside the default array field layout (toolbars, section headers, sticky footers, custom wrappers).

The hook **delegates to the field array that renders the rows**, so calling `append()` from a toolbar immediately adds a visible row. It does not create a competing field array.

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
function useArrayField(fieldName: string): ArrayFieldActions & {
  rowCount: number
  canAdd: boolean
  atMin: boolean
}
```

## Parameters

| Name        | Type     | Description                                                                    |
| ----------- | -------- | ------------------------------------------------------------------------------ |
| `fieldName` | `string` | Dot-notated array field path (for example `"lineItems"`, `"profile.contacts"`) |

## Returns

`useArrayField` returns the same row operations as [`useFieldArray`](https://react-hook-form.com/docs/usefieldarray):

- `fields` — the current rows, each carrying react-hook-form's generated `id`
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

## Requirements

- Must be called from a component rendered under `<AutoForm>`.
- `fieldName` should point to an array in the form schema.

When UniForm does not render the array — it is `hidden`, or replaced by a custom component via `fields.<name>.component` — the operations fall back to writing the array value directly, so the hook still works.

In development, calling `useArrayField` with a path that is neither a mounted array field nor an array in the schema logs a `console.warn` naming the path, instead of silently doing nothing.

## Primitive arrays

The hook works identically for arrays of primitives:

```tsx
const schema = z.object({ tags: z.array(z.string()).max(5) })

function TagToolbar() {
  const { append, canAdd } = useArrayField('tags')
  return (
    <button type='button' disabled={!canAdd} onClick={() => append('')}>
      + Add tag
    </button>
  )
}
```

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

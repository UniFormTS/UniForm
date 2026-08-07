---
title: useFormValue() / useFormValues()
sidebar_position: 8
---

# `useFormValue()` / `useFormValues()`

Typed, reactive reads of form state from anywhere under `<AutoForm>` or [`<UniFormProvider>`](./uniform-provider).

Pass the form as the first argument and the value type is inferred from the schema — **no casts**, and no need to import `useWatch` or `Control` from `react-hook-form`.

```tsx
import { useFormValue, useFormValues } from '@uniform-ts/core'

function PageHeader() {
  const title = useFormValue(ticketForm, 'title') // string
  const priority = useFormValue(ticketForm, 'priority') // 'low' | 'normal' | 'urgent'
  return (
    <h1>
      {title || 'Untitled'} — {priority}
    </h1>
  )
}
```

## `useFormValue()`

```ts
// Inference form (recommended)
function useFormValue<TSchema, K extends FieldPath<Values>>(
  form: { readonly schema: TSchema },
  name: K,
): FieldPathValue<Values, K>

// Bare form — annotate the value yourself
function useFormValue<TValue = unknown>(name: string): TValue
```

- Re-renders **only** when the watched path changes.
- Index paths work: `useFormValue(form, 'lines.0.sku')`.
- An unknown path is a **compile error** in the inference form.
- The first argument may be the `createForm(schema)` definition **or** the live `useUniForm()` result. Passing the live instance also works in the component that created it, above the provider.

## `useFormValues()`

```ts
function useFormValues<TSchema>(form: { readonly schema: TSchema }): Values
function useFormValues<TValues = Record<string, unknown>>(): TValues
```

Reads the whole values object, and therefore re-renders on **every** change. Prefer `useFormValue` when you only need one path.

## Requirements

Must be called under `<AutoForm>` / `<UniFormProvider>`, **or** given the live `useUniForm()` result as the first argument. Otherwise it throws with a message naming the path it tried to read.

For imperative reads and writes, use `formMethods` from [`useAutoFormContext()`](./use-auto-form-context) or `instance.methods`.

See also: [`useUniForm()`](./use-uniform), [Headless Mode guide](/docs/guides/headless).

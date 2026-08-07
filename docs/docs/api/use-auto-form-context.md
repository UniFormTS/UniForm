---
title: useAutoFormContext()
sidebar_position: 5
---

# `useAutoFormContext()`

`useAutoFormContext()` returns the context of the nearest `<AutoForm>` or [`<UniFormProvider>`](./uniform-provider) ancestor. It lets custom layout components, field wrappers, and submit buttons read form state and call form methods without prop-drilling.

**Pass the form to infer the schema's value type** — this is the recommended form, and removes the need for casts like `control as unknown as Control<MyValues>`:

```tsx
import { useAutoFormContext } from '@uniform-ts/core'

function StatusBar() {
  const { formMethods, disabled } = useAutoFormContext(ticketForm)
  const values = formMethods.getValues() // TicketValues — fully typed

  return (
    <div>
      {disabled && <span>Form is read-only</span>}
      <pre>{JSON.stringify(values, null, 2)}</pre>
    </div>
  )
}
```

For reactive reads prefer [`useFormValue()`](./use-form-value) — it re-renders only when the watched path changes.

## Signature

```ts
// Inference form (recommended)
function useAutoFormContext<TSchema extends z.ZodObject>(form: {
  readonly schema: TSchema
}): AutoFormContextValue<z.infer<TSchema>>

// Explicit type argument
function useAutoFormContext<
  TValues extends FieldValues = FieldValues,
>(): AutoFormContextValue<TValues>
```

The generic threads through `control` and `formMethods`. The default type argument keeps every existing call site compiling.

Throws if called outside an `<AutoForm>` / `<UniFormProvider>` subtree — unless you pass the live `useUniForm()` result, which carries its own context and therefore works above the provider too.

## Returns

### `AutoFormContextValue<TValues>`

**Supported surface:**

| Property       | Type                                     | Description                                                                  |
| -------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `formMethods`  | `FormMethods<TValues>`                   | Programmatic form methods — see [`FormMethods`](/docs/api/types#formmethods) |
| `control`      | `Control<TValues>`                       | The underlying `react-hook-form` `Control` object                            |
| `registry`     | `ComponentRegistry`                      | The resolved component registry for this form                                |
| `fieldConfigs` | `FieldConfig[]`                          | Introspected field config array derived from the schema                      |
| `fieldWrapper` | `React.ComponentType<FieldWrapperProps>` | The active field wrapper component                                           |
| `layout`       | `ResolvedLayoutSlots`                    | All layout slots (formWrapper, submitButton, arrayButtons, …) fully resolved |
| `classNames`   | `FormClassNames`                         | CSS class names for form, label, error, and description elements             |
| `disabled`     | `boolean`                                | Whether the entire form is currently disabled                                |
| `coercions`    | `CoercionMap \| undefined`               | Active value coercion map                                                    |
| `messages`     | `ValidationMessages \| undefined`        | Active custom validation messages                                            |
| `labels`       | `FormLabels`                             | UI label overrides (submit button text, array button text, …)                |

**Internal — may change without a major release:** `resolvedFields`, `fieldOverrides`, `layoutSlots`, `setDynamicMeta`, `arrayFields`.

## Common use cases

### Reading `disabled` in a custom field wrapper

```tsx
import type { FieldWrapperProps } from '@uniform-ts/core'
import { useAutoFormContext } from '@uniform-ts/core'

export function MyFieldWrapper({ children, field, error }: FieldWrapperProps) {
  const { classNames, disabled } = useAutoFormContext()

  return (
    <div
      className={classNames.fieldWrapper}
      data-disabled={field.meta.disabled || disabled || undefined}
    >
      <label htmlFor={field.name} className={classNames.label}>
        {field.label}
      </label>
      {children}
      {error && <span className={classNames.error}>{error}</span>}
    </div>
  )
}
```

### Reading `labels` in a custom submit button

```tsx
import { useAutoFormContext } from '@uniform-ts/core'

export function MySubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { labels } = useAutoFormContext()

  return (
    <button type='submit' disabled={isSubmitting}>
      {labels.submit ?? 'Submit'}
    </button>
  )
}
```

### Calling `formMethods` from a layout component

`formMethods` exposes the same imperative API as the handle exposed via `ref` on `<AutoForm>`. Use it to read or mutate form state from inside any component in the subtree.

```tsx
import { useAutoFormContext } from '@uniform-ts/core'

function ResetButton() {
  const { formMethods } = useAutoFormContext()

  return (
    <button type='button' onClick={() => formMethods.reset()}>
      Reset
    </button>
  )
}
```

## Requirements

- Must be called from a component rendered inside an `<AutoForm>` or `<UniFormProvider>` subtree — or given the live `useUniForm()` result.
- Throws `[UniForm] useAutoFormContext must be used inside an <AutoForm> or <UniFormProvider> component.` otherwise.

See also: [Headless Mode guide](/docs/guides/headless), [`useFormValue()`](/docs/api/use-form-value), [Programmatic control guide](/docs/guides/programmatic-control), [`FormMethods`](/docs/api/types#formmethods), [`useArrayField()`](/docs/api/use-array-field).

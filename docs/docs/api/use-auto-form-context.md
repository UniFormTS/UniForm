---
title: useAutoFormContext()
sidebar_position: 5
---

# `useAutoFormContext()`

`useAutoFormContext()` returns the internal context of the nearest `<AutoForm>` ancestor. It lets custom layout components, field wrappers, and submit buttons read form state and call form methods without prop-drilling.

```tsx
import { useAutoFormContext } from '@uniform-ts/core'

function StatusBar() {
  const { formMethods, disabled } = useAutoFormContext()
  const values = formMethods.watch()

  return (
    <div>
      {disabled && <span>Form is read-only</span>}
      <pre>{JSON.stringify(values, null, 2)}</pre>
    </div>
  )
}
```

## Signature

```ts
function useAutoFormContext(): AutoFormContextValue
```

Throws if called outside an `<AutoForm>` subtree.

## Returns

### `AutoFormContextValue`

| Property         | Type                                                                                   | Description                                                                    |
| ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `registry`       | `ComponentRegistry`                                                                    | The resolved component registry for this form                                  |
| `fieldConfigs`   | `FieldConfig[]`                                                                        | Introspected field config array derived from the schema                        |
| `fieldOverrides` | `Record<string, unknown>`                                                              | Per-field overrides passed via the `fields` prop                               |
| `fieldWrapper`   | `React.ComponentType<FieldWrapperProps>`                                               | The active field wrapper component                                             |
| `layout`         | `ResolvedLayoutSlots`                                                                  | All layout slots (formWrapper, submitButton, arrayButtons, …) fully resolved   |
| `classNames`     | `FormClassNames`                                                                       | CSS class names for form, label, error, and description elements               |
| `disabled`       | `boolean`                                                                              | Whether the entire form is currently disabled                                  |
| `coercions`      | `CoercionMap \| undefined`                                                             | Active value coercion map                                                      |
| `messages`       | `ValidationMessages \| undefined`                                                      | Active custom validation messages                                              |
| `labels`         | `FormLabels`                                                                           | UI label overrides (submit button text, array button text, …)                  |
| `formMethods`    | `FormMethods`                                                                          | Programmatic form methods — see [`FormMethods`](/docs/api/types#formmethods)   |
| `control`        | `Control`                                                                              | The underlying `react-hook-form` `Control` object                              |
| `setDynamicMeta` | `React.Dispatch<React.SetStateAction<Record<string, Partial<FieldDependencyResult>>>>` | Internal setter for dynamic field metadata — rarely needed in application code |

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

- Must be called from a component rendered **inside** an `<AutoForm>` subtree.
- Throws `[UniForm] useAutoFormContext must be used inside an <AutoForm> component.` if called outside one.

See also: [Programmatic control guide](/docs/guides/programmatic-control), [`FormMethods`](/docs/api/types#formmethods), [`useArrayField()`](/docs/api/use-array-field).

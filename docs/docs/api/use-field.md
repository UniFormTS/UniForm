---
title: useField()
sidebar_position: 10
---

# `useField()`

Returns the fully resolved props for a single leaf field, so you can render your own input while UniForm keeps registration, coercion, validation and error resolution.

This is the primitive behind [`<Field>`](./field) — reach for `<Field>` first, and for `useField` when you need to control the markup entirely.

```tsx
import { useField } from '@uniform-ts/core'

function CityInput() {
  const { value, onChange, onBlur, ref, label, error, required } =
    useField<string>('address.city')

  return (
    <label>
      {label}
      {required && ' *'}
      <input
        ref={ref}
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        aria-required={required}
        aria-invalid={Boolean(error)}
      />
      {error && <span role='alert'>{error}</span>}
    </label>
  )
}
```

## Signature

```ts
function useField<TValue = unknown>(
  name: string,
  options?: { label?: string; disabled?: boolean },
): FieldProps<TValue> & { config: FieldConfig }
```

## Returns

Everything in [`FieldProps`](/docs/api/types#fieldprops) — `name`, `value`, `onChange`, `onBlur`, `ref`, `label`, `placeholder`, `description`, `error`, `required`, `disabled`, `options`, `meta`, `schema` — plus `config`, the resolved `FieldConfig`.

`onChange` applies the same coercion `<AutoForm>` applies (`string → number`, `string → Date`, …) and fires any `onChange` handler registered for the field.

## Paths

Absolute by default; relative inside a component registered for an object or array field.

### `useFieldPath()`

Returns the current base path, so a container component can compose paths explicitly:

```tsx
import { useFieldPath } from '@uniform-ts/core'

function Cell() {
  const base = useFieldPath() // e.g. 'lines'
}
```

## Requirements

Must be called under `<AutoForm>` or [`<UniFormProvider>`](./uniform-provider). An unknown path logs a `console.warn` — the input still registers with react-hook-form, but it has no label, validation metadata or registered component.

See also: [`<Field>`](./field), [Headless Mode guide](/docs/guides/headless).

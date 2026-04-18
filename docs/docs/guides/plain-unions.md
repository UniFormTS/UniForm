---
title: Plain Unions
sidebar_position: 9
description: How UniForm renders plain z.union() / z.or() fields, and how to access the full schema for custom components.
---

# Plain Unions

Zod lets you express a field that accepts more than one type via `z.union([...])` or the `.or()` shorthand:

```ts
const schema = z.object({
  amount: z.number().or(z.literal('')),
  value: z.union([z.string(), z.number()]),
})
```

## Rendering strategy — first-variant collapse

UniForm cannot reliably render an arbitrary union as a single input (the valid values might be completely unrelated types). Instead it **collapses the union to its first variant** at introspection time:

| Schema                                             | Rendered as    |
| -------------------------------------------------- | -------------- |
| `z.number().or(z.literal(''))`                     | `number` field |
| `z.union([z.string(), z.number()])`                | `string` field |
| `z.union([z.enum(['a','b']), z.literal('other')])` | `select` field |

This means the form always renders something meaningful for the dominant type, while still accepting the full union during validation.

## Validation is unaffected

The collapse is **rendering-only**. UniForm passes the original Zod schema to `zodResolver`, so the full union is enforced on submit. For example, `z.number().or(z.literal(''))` will accept either a number or the empty string without any extra configuration.

## Accessing the full schema — the `schema` escape hatch

Every `FieldConfig` (and the corresponding `FieldProps` received by custom components) carries a `schema` property containing the **original, unwrapped Zod schema** for that field. For plain unions this is the union schema itself — not the collapsed first variant.

Use this when the default rendering is not what you want:

```tsx
import type { FieldProps } from '@uniform-ts/core'
import * as z from 'zod/v4/core'

function FlexibleInput({ schema, value, onChange, ...props }: FieldProps) {
  const def = schema._zod.def

  // Detect plain union at runtime
  if (def.type === 'union') {
    const variants = (def as z.$ZodUnionDef).options
    // Build a toggle, type-switcher, multi-type input, etc.
    return (
      <MyUnionInput
        variants={variants}
        value={value}
        onChange={onChange}
        {...props}
      />
    )
  }

  return (
    <input
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    />
  )
}
```

Register the component for the specific field:

```tsx
<AutoForm
  form={myForm}
  fields={{
    amount: { component: FlexibleInput },
  }}
  onSubmit={handleSubmit}
/>
```

The `schema` escape hatch is available on **every** field type — not just unions — so you can always inspect the underlying Zod schema if you need capabilities beyond what `FieldConfig` exposes.

## Discriminated unions

If you need the form to **swap its visible fields** based on a discriminant value, use `z.discriminatedUnion()` instead. UniForm has first-class support for it and will automatically show only the fields for the active variant. See [Discriminated Unions](./discriminated-unions) for details.

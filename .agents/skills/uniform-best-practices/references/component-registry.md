# Component registry & custom components — deep detail

Read this when writing custom field components, customising which Zod type maps to which component, or handling union fields.

## Table of contents

- [Built-in registry keys](#built-in-registry-keys)
- [Resolution order](#resolution-order)
- [The `FieldProps` contract](#the-fieldprops-contract)
- [Rendering a string field as a select](#rendering-a-string-field-as-a-select)
- [The `schema` escape hatch](#the-schema-escape-hatch)
- [Plain unions](#plain-unions)

## Built-in registry keys

`defaultRegistry` ships minimal components. The keys you can override:

| Key        | Matches                                                          | Default renders           |
| ---------- | ---------------------------------------------------------------- | ------------------------- |
| `string`   | `z.string()`                                                     | `<input>`                 |
| `number`   | `z.number()`                                                     | `<input type="number">`   |
| `boolean`  | `z.boolean()`                                                    | `<input type="checkbox">` |
| `date`     | `z.date()`                                                       | date `<input>`            |
| `select`   | `z.enum()` / `z.nativeEnum()` / string field with `meta.options` | `<select>`                |
| `textarea` | opt-in via `meta.component: 'textarea'` or `fields`              | `<textarea>`              |

Your registry is **merged** with `defaultRegistry`, so overriding `string` leaves the other keys intact. Add your own keys freely (`'rating'`, `'slider'`, `'colorpicker'`) and point fields at them with `fields={{ score: { component: 'rating' } }}`.

## Resolution order

For each field UniForm picks the component in this order:

1. `fields[name].component` — an inline component or a registry-key string (per-field win).
2. `components[typeKey]` — your registry override for that Zod type.
3. `defaultRegistry[typeKey]` — the built-in default.

So: register under a type key to restyle **all** fields of that type; pass `component` in `fields` to override a **single** field.

```tsx
// Every z.string() field uses MyTextInput…
<AutoForm components={{ string: MyTextInput }} ... />

// …except `bio`, which uses a textarea:
<AutoForm
  components={{ string: MyTextInput }}
  fields={{ bio: { component: 'textarea' } }}
  ...
/>
```

## The `FieldProps` contract

Every field component receives `FieldProps<Value>`. Always parameterise it with the field's value type so `value` and `onChange` are typed precisely (e.g. `FieldProps<number>` for a numeric widget, `FieldProps<string[]>` for a multi-select).

```tsx
import type { FieldProps } from '@uniform-ts/core'

export function StarRating({ value, onChange, error }: FieldProps<number>) {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          type='button'
          key={star}
          onClick={() => onChange(star)}
          style={{ color: (Number(value) || 0) >= star ? 'gold' : 'gray' }}
        >
          ★
        </button>
      ))}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  )
}
```

Register it, then point a field at it:

```tsx
<AutoForm
  components={{ rating: StarRating }}
  fields={{ score: { label: 'Your rating', component: 'rating' } }}
  ...
/>
```

`FieldProps` also carries `error`, the field metadata (label, placeholder, options, disabled), and the raw `schema` (see below). Read the values you need and forward the rest to your DOM element.

## Rendering a string field as a select

When the option list is only known at runtime (or you want a plain `string` in the output type rather than an enum union), keep the field as `z.string()` and declare options via `.meta()`:

```ts
const schema = z.object({
  role: z.string().meta({
    component: 'select',
    options: [
      { label: 'User', value: 'user' },
      { label: 'Admin', value: 'admin' },
    ],
  }),
})
```

UniForm treats this as a `select` during introspection and passes the options to your select component. This is the runtime-friendly alternative to `z.enum([...])`.

## The `schema` escape hatch

Every `FieldConfig` — and therefore every `FieldProps` — carries a `schema` property holding the **original, unwrapped Zod schema** for that field. Use it when you need capabilities beyond what the metadata exposes (inspecting refinements, union variants, etc.):

```tsx
import type { FieldProps } from '@uniform-ts/core'

function FlexibleInput({ schema, value, onChange, ...props }: FieldProps) {
  const def = schema._zod.def
  if (def.type === 'union') {
    // build a type switcher from def.options
  }
  return (
    <input value={value as string} onChange={(e) => onChange(e.target.value)} />
  )
}
```

## Plain unions

UniForm cannot render an arbitrary `z.union([...])` / `.or()` as a single input, so at introspection time it **collapses the union to its first variant** for rendering:

| Schema                                             | Rendered as    |
| -------------------------------------------------- | -------------- |
| `z.number().or(z.literal(''))`                     | `number` field |
| `z.union([z.string(), z.number()])`                | `string` field |
| `z.union([z.enum(['a','b']), z.literal('other')])` | `select` field |

The collapse is **rendering-only** — the original union is still passed to `zodResolver`, so the full union is enforced on submit (`z.number().or(z.literal(''))` accepts either a number or an empty string with no extra config). When the first-variant rendering is wrong for your case, register a custom component for that field and use the `schema` escape hatch to inspect the union and render whatever input you need.

To _swap visible fields_ based on a discriminant value, use `z.discriminatedUnion()` instead — see [reactivity.md](reactivity.md#discriminated-unions).

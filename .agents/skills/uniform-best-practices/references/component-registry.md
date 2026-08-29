# Component registry & custom components — deep detail

Read this when writing custom field components, customising which Zod type maps to which component, or handling union fields.

## Table of contents

- [Built-in registry keys](#built-in-registry-keys)
- [Resolution order](#resolution-order)
- [The `FieldProps` contract](#the-fieldprops-contract)
- [Rendering a string field as a select](#rendering-a-string-field-as-a-select)
- [Option identity for rich select values](#option-identity-for-rich-select-values)
- [The `schema` escape hatch](#the-schema-escape-hatch)
- [Plain unions](#plain-unions)

## Option identity for rich select values

Select option values are `string | number` by default and need nothing extra. For richer values — a composite key such as `{ dataset, version }` — supply an identity rather than hand-rolling a key/equality layer outside the library:

```tsx
const reportKey = (option: { value: unknown }) => {
  const id = option.value as ReportId
  return `${id.dataset}@${id.version}`
}

<AutoForm
  fields={{
    source: {
      component: 'select',
      options: reports,
      getOptionKey: reportKey,
      isOptionEqual: (a, b) => reportKey({ value: a }) === reportKey({ value: b }),
    },
  }}
  ...
/>
```

- `getOptionKey(option)` — stable string for React keys and the DOM `value`. **Required** when values are not strings, numbers or booleans.
- `isOptionEqual(formValue, optionValue)` — which option is selected. Defaults to `Object.is`, then key equality; usually omit it.
- **The key is never the value.** `onChange` always receives the option's raw `value`, so objects round-trip unchanged (and a numeric option submits a `number`, not `"2"`).
- Set both once for every form via `createAutoForm({ getOptionKey, isOptionEqual })`; per-field `meta` wins.
- UniForm throws, naming the field, when an object-valued option has no `getOptionKey` or two options share a key — both are silent selection bugs otherwise.
- `SelectOption`'s value type defaults to `string | number`; type rich lists as `SelectOption<MyValue>[]` and the component as `FieldProps<MyValue>`.

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

## Rendering an object or array as a single field

By default a `z.object({...})` renders as a nested fieldset and a `z.array(z.object({...}))` as repeating rows. Point either at a component override — **a direct component or a string registry key** — to collapse it into one field whose `value` is the whole object/array:

```tsx
type UserRef = { value: string; label: string }

function UserSelect({ value, onChange }: FieldProps<UserRef>) {
  return (
    <select
      value={value?.value ?? ''}
      onChange={(e) => onChange(lookupUser(e.target.value))}
    >
      {/* … */}
    </select>
  )
}

const schema = z.object({
  assignee: z.object({ value: z.string(), label: z.string() }),
})

<AutoForm
  form={createForm(schema)}
  components={{ userSelect: UserSelect }}
  fields={{ assignee: { component: 'userSelect' } }} // string key OR the component itself
  ...
/>
```

The component receives the entire object (or array) as `value` and must call `onChange` with a full object/array; validation still runs against the complete schema. If the string key does not resolve in the merged registry, the field falls back to the default nested rendering.

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

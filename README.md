# UniForm

> Headless React + Zod V4 form library. Zero styles — bring your own components.

UniForm takes a Zod schema and automatically renders a fully customizable form. It handles field introspection, validation, coercion, and layout — you provide the components and styling.

## Installation

```bash
npm install @uniform-ts/core react react-hook-form zod
```

## Quick Start

```tsx
import * as z from 'zod/v4'
import { createForm, AutoForm } from '@uniform-ts/core'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

// createForm wraps your schema and holds typed onChange handlers
const myForm = createForm(schema)

function MyForm() {
  return (
    <AutoForm
      form={myForm}
      defaultValues={{ role: 'user', subscribe: false }}
      onSubmit={(values) => console.log(values)}
    />
  )
}
```

UniForm introspects the schema, renders appropriate inputs, validates with Zod, and calls `onSubmit` with fully typed values.

## Key Concepts

**`createForm(schema)`** — creates a typed form definition outside React. Use `.setOnChange(field, handler)` to attach async field-level side effects (e.g. cascading dropdowns).

**`createAutoForm(defaults)`** — factory that bakes in your design system defaults (components, classNames, fieldWrapper) once, so you don't repeat them on every form.

**`useArrayField(fieldName)`** — a React hook for external array controls (toolbars, section headers, sticky footers) inside the `<AutoForm>` tree. It returns `append/remove/move/...` from `useFieldArray` plus `rowCount`, `canAdd`, and `atMin` derived from the array's `minItems`/`maxItems`.

**`components`** — a registry mapping Zod types (`string`, `number`, `boolean`, etc.) to your own input components. Pass a component directly on a field via `fields` for one-off overrides. For custom components, type field values precisely with `FieldProps<Value>` (for example, `FieldProps<number>` for a rating widget).

**`fields`** — per-field overrides using dot-notated paths. Control labels, descriptions, ordering, sections, conditions, and custom components without touching the schema.

```tsx
<AutoForm
  form={myForm}
  components={{ string: MyTextInput, boolean: MyToggle }}
  fields={{
    email: { label: 'Work Email', description: 'We will never share it' },
    role: { order: 0, section: 'Account' },
    subscribe: { condition: (values) => values.role !== 'admin' },
  }}
  onSubmit={handleSubmit}
/>
```

## Core Props

| Prop            | Type                                     | Description                                                                                                       |
| --------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `form`          | `UniForm<TSchema>`                       | Schema + onChange handlers from `createForm()`                                                                    |
| `onSubmit`      | `(values) => void \| Promise<void>`      | Called with typed values after successful validation                                                              |
| `defaultValues` | `Partial<...>` or `() => Promise<...>`   | Initial values; async function shows `loadingFallback`                                                            |
| `components`    | `ComponentRegistry`                      | Map Zod types to your input components                                                                            |
| `fields`        | `Record<string, FieldOverride>`          | Per-field label, description, order, section, condition                                                           |
| `fieldWrapper`  | `React.ComponentType<FieldWrapperProps>` | Custom wrapper around every scalar field                                                                          |
| `layout`        | `LayoutSlots`                            | Replace form/section/object/array wrappers, submit button, array rows                                             |
| `classNames`    | `FormClassNames`                         | CSS classes for form, fields, labels, errors, fieldset/legend wrappers                                            |
| `ref`           | `React.Ref<AutoFormHandle>`              | Imperative `reset`, `submit`, `setValues`, `getValues`                                                            |
| `persistKey`    | `string`                                 | Auto-save form state to `localStorage` under this key                                                             |
| `labels`        | `FormLabels`                             | Override built-in UI strings for i18n; import a ready-made locale pack from `@uniform-ts/core/locales/{en,he,es}` |

## Features

- **Full Zod V4 support** — scalars, enums, objects, arrays, optionals, defaults, unions, discriminated unions
- **react-hook-form** under the hood — performant, uncontrolled forms with `zodResolver`
- **Section grouping** — group fields into named sections via `meta.section`
- **Conditional fields** — show/hide fields based on form values; `hidden` and row-local sibling conditions work inside array rows too
- **Array fields** — movable, duplicable, collapsible rows; `minItems`/`maxItems` from Zod schema; per-row conditional fields
- **External array controls** — use `useArrayField('path.to.array')` to place Add/Remove controls outside the default array block while staying in sync with schema limits
- **Programmatic control** — `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `focus()` via ref
- **Form persistence** — auto-save to `localStorage` (or custom storage) with configurable debounce
- **Pluggable coercion** — automatic `string → number`, `string → Date` with customizable coercion map
- **i18n** — override every hard-coded UI string (including aria labels) via `labels` prop; import a ready-made locale pack and optionally spread-override individual keys
- **Tree-shakeable** — ESM + CJS builds via tsup

## Documentation

Full API reference, guides, and examples: **[uniformts.github.io/UniForm](https://uniformts.github.io/UniForm/)**

## License

MIT

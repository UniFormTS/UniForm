# UniForm

[![skills.sh](https://skills.sh/b/UniFormTS/UniForm)](https://skills.sh/UniFormTS/UniForm)

> Headless React + Zod V4 form library. Zero styles — bring your own components.

UniForm takes a Zod schema and automatically renders a fully customizable form. It handles field introspection, validation, coercion, and layout — you provide the components and styling.

## Installation

```bash
npm install @uniform-ts/core react react-hook-form zod
```

## AI Agent Skill

Using an AI coding assistant (Copilot, Claude, etc.)? Install the UniForm skill so it builds forms the idiomatic way — schema-first, with the right `createForm` / `AutoForm` patterns:

```bash
npx skills add https://github.com/UniFormTS/UniForm --skill uniform-best-practices
```

Discover it on [skills.sh](https://skills.sh/UniFormTS/UniForm).

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

**`useArrayField(fieldName)`** — a React hook for external array controls (toolbars, section headers, sticky footers) inside the `<AutoForm>` tree. It delegates to the field array that renders the rows — so `append()` from a toolbar adds a visible row — and returns `append/prepend/insert/remove/move/swap/update/replace` plus `fields`, `rowCount`, `canAdd`, and `atMin` derived from the array's `minItems`/`maxItems`.

### Headless mode — own the layout, keep the plumbing

`<AutoForm>` renders everything, and that is the right default. When the application owns the page instead, keep the store, registration, resolver and registry and render the rest yourself:

**`useUniForm(form, options)`** — builds the form store **above** `<AutoForm>`: the react-hook-form instance, the Zod resolver, the introspected field configs, the component registry and the persistence wiring. Returns `{ schema, control, methods, submit, isSubmitting, isLoading, clearPersistedData }`. Passing the result to `<AutoForm form={instance}>` renders into that store — it never creates a second one.

**`<UniFormProvider form={instance}>`** — publishes the instance so every UniForm hook resolves in the subtree, with no `<AutoForm>` rendered at all.

**`useAutoFormContext(form)`** — the form context (`formMethods`, `control`, `registry`, `layout`, `classNames`, `labels`, `disabled`, …). Pass the form to infer the schema's value type; no casts required.

**`useFormValue(form, path)` / `useFormValues(form)`** — typed, reactive reads of form state. `useFormValue` re-renders only when the watched path changes, and index paths (`'lines.0.sku'`) work.

**`<Field name="address.city" />` / `useField(path)`** — render one field, or wire your own input, anywhere in the tree. Inside a component registered for an object/array field, paths resolve **relative** to that field (`<Field name="0.qty" />`), and the container receives `path`, `setPath`, `rows`, `rowCount` and the row operations — so a bespoke layout keeps registration, validation and errors for every leaf inside it.

```tsx
const form = useUniForm(ticketForm, { defaultValues, onSubmit: save })

<UniFormProvider form={form}>
  <PageHeader title={useFormValue(ticketForm, 'title')} onSave={form.submit} />
  <AutoForm form={form} onSubmit={save} />
</UniFormProvider>
```

After this, an app never needs to import `useWatch`, `Control` or `useFieldArray` from `react-hook-form` directly. See the [Headless Mode guide](https://uniformts.github.io/UniForm/docs/guides/headless).

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

| Prop            | Type                                     | Description                                                                                                                              |
| --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `form`          | `UniForm<TSchema>` or `useUniForm()` result | Schema + onChange handlers from `createForm()`, or an existing store                                                    |
| `onSubmit`      | `(values) => void \| Promise<void>`      | Called with typed values after successful validation                                                                                     |
| `defaultValues` | `Partial<...>` or `() => Promise<...>`   | Initial values; async function shows `loadingFallback`                                                                                   |
| `components`    | `ComponentRegistry`                      | Map Zod types to your input components                                                                                                   |
| `fields`        | `Record<string, FieldOverride>`          | Per-field label, description, order, section, condition                                                                                  |
| `fieldWrapper`  | `React.ComponentType<FieldWrapperProps>` | Custom wrapper around every scalar field                                                                                                 |
| `layout`        | `LayoutSlots`                            | Replace form/section/object/array wrappers, submit button, array rows. Set `null` on omittable slots (submit/array buttons) to hide them |
| `classNames`    | `FormClassNames`                         | CSS classes for form, fields, labels, errors, fieldset/legend wrappers                                                                   |
| `ref`           | `React.Ref<AutoFormHandle>`              | Imperative `reset`, `submit`, `setValues`, `getValues`                                                                                   |
| `persistKey`    | `string`                                 | Auto-save form state to `localStorage` under this key                                                                                    |
| `labels`        | `FormLabels`                             | Override built-in UI strings for i18n; import a ready-made locale pack from `@uniform-ts/core/locales/{en,he,es}`                        |

## Features

- **Full Zod V4 support** — scalars, enums, objects, arrays, optionals, defaults, unions, discriminated unions
- **react-hook-form** under the hood — performant, uncontrolled forms with `zodResolver`
- **Section grouping** — group fields into named sections via `meta.section`
- **Conditional fields** — show/hide fields based on form values; `hidden` and row-local sibling conditions work inside array rows too
- **Array fields** — objects _or_ primitives as rows (`z.array(z.string())` renders one input per row); movable, duplicable, collapsible rows; `minItems`/`maxItems` from Zod schema; per-row conditional fields
- **External array controls** — use `useArrayField('path.to.array')` to place Add/Remove controls outside the default array block while staying in sync with schema limits
- **Headless mode** — `useUniForm` + `<UniFormProvider>` + `<Field>` let the app own the page layout while UniForm keeps the store, registration, validation and errors
- **Typed state access** — `useFormValue` / `useFormValues` / `useAutoFormContext(form)` infer value types straight from the schema, with no casts and no `react-hook-form` imports
- **Programmatic control** — `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `focus()` via ref
- **Form persistence** — auto-save to `localStorage` (or custom storage) with configurable debounce
- **Pluggable coercion** — automatic `string → number`, `string → Date` with customizable coercion map
- **i18n** — override every hard-coded UI string (including aria labels) via `labels` prop; import a ready-made locale pack and optionally spread-override individual keys
- **Tree-shakeable** — ESM + CJS builds via tsup

## Documentation

Full API reference, guides, and examples: **[uniformts.github.io/UniForm](https://uniformts.github.io/UniForm/)**

## License

MIT

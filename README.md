# UniForm

> Headless React + Zod V4 form library. Zero styles — bring your own components.

UniForm takes a Zod schema and automatically renders a fully customizable form. It handles introspection, validation, coercion, and layout — you provide the components and styling.

## Features

- **Schema-driven** — define your form once with Zod V4, get inputs, labels, validation, and types for free
- **Headless** — zero CSS, zero opinions; bring your own design system
- **Full Zod V4 support** — scalars, enums, objects, arrays, optionals, nullables, defaults, pipes/transforms, unions, discriminated unions
- **react-hook-form** under the hood — performant, uncontrolled forms with `zodResolver`
- **`createForm()` / `UniForm`** — type-safe form definition object that lives outside React; attach typed `onChange` handlers per field with access to all form methods
- **Per-field `onChange` in `fields` prop** — react to individual field changes inline, with typed values and full form control methods
- **Per-field custom components** — pass any `React.ComponentType<FieldProps>` directly as `meta.component` (inline, no registry) or register under a custom string key; direct components bypass the registry _and_ the default `ArrayField`/`ObjectField` routing, allowing fully custom multi-value widgets for `array`-typed fields
- **Layout hooks** — `classNames`, `fieldWrapper`, `layout.formWrapper`, `layout.sectionWrapper`, `layout.submitButton`
- **Section grouping** — group fields into named sections via `meta.section`
- **Conditional fields** — show/hide fields based on form values with `meta.condition`
- **Field ordering** — control render order with `meta.order`
- **`createAutoForm()` factory** — bake in your design system defaults once, use everywhere
- **Deep field overrides** — dot-notated `fields` prop for nested object/array overrides
- **Pluggable coercion** — automatic string→number, string→Date with customizable coercion map
- **Custom validation messages** — global, per-field, and per-field-per-error-code message overrides
- **Programmatic control via ref** — `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `clearErrors()`, `focus()` via `AutoFormHandle`
- **Form state persistence** — auto-save form values to `localStorage` (or custom storage) with configurable debounce; restored on mount, cleared on submit
- **Enhanced array fields** — opt-in row reordering (move up/down), duplicate, collapsible object rows with summary, `minItems`/`maxItems` constraints from Zod `.min()`/`.max()`, via `movable`/`duplicable`/`collapsible` meta flags
- **Array button styling** — `classNames.arrayAdd`, `arrayRemove`, `arrayMove`, `arrayDuplicate`, `arrayCollapse`
- **Custom array row layout** — `layout.arrayRowLayout` lets you fully control button placement within each array row
- **Field index & depth CSS vars** — `--field-index` and `--field-depth` on every field wrapper for advanced CSS targeting
- **Value cascade** — `onValuesChange` fires on every change with the full form values; use with `ref.setValues()` to imperatively sync field values
- **i18n / custom labels** — `labels` prop (and factory-level `labels` config) replaces every hard-coded UI string (`"Submit"`, `"Add"`, `"Remove"`, move/duplicate/collapse buttons) without touching layout slots
- **Tree-shakeable** — ESM + CJS builds via tsup with `sideEffects: false`

## Quick Start

### Installation

```bash
npm install @uniform/core react react-hook-form zod
```

### Basic Usage

```tsx
import * as z from 'zod/v4'
import { createForm, AutoForm } from '@uniform/core'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  age: z.number().min(0).optional(),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

// createForm wraps your schema — pass the result to <AutoForm form={...}>
const myForm = createForm(schema)

function MyForm() {
  return (
    <AutoForm
      form={myForm}
      defaultValues={{ role: 'user', subscribe: false }}
      onSubmit={(values) => {
        // values is fully typed as z.infer<typeof schema>
        console.log(values)
      }}
    />
  )
}
```

That's it — UniForm introspects the schema, renders appropriate inputs, validates with Zod, and calls `onSubmit` with typed values.

## API Reference

### `<AutoForm>` Props

| Prop              | Type                                                  | Default               | Description                                                                   |
| ----------------- | ----------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------- |
| `form`            | `UniForm<TSchema>`                                    | _required_            | A `UniForm` / `createForm` instance carrying the schema and onChange handlers |
| `onSubmit`        | `(values: z.infer<TSchema>) => void \| Promise<void>` | _required_            | Called with fully typed, validated values on successful submit                |
| `defaultValues`   | `Partial<z.infer<TSchema>>`                           | `{}`                  | Pre-fill form fields                                                          |
| `components`      | `ComponentRegistry`                                   | `defaultRegistry`     | Override field type → component mapping                                       |
| `fields`          | `Record<string, Partial<FieldOverride>>`              | `{}`                  | Per-field metadata overrides (supports dot-notated paths for nested fields)   |
| `fieldWrapper`    | `React.ComponentType<FieldWrapperProps>`              | `DefaultFieldWrapper` | Wrap each scalar field in a custom container                                  |
| `layout`          | `LayoutSlots`                                         | `{}`                  | Replace form wrapper, section wrapper, submit button, or array row layout     |
| `classNames`      | `FormClassNames`                                      | `{}`                  | CSS class names for form, field wrappers, labels, errors, descriptions        |
| `disabled`        | `boolean`                                             | `false`               | Disable all form fields and the submit button                                 |
| `coercions`       | `CoercionMap`                                         | `defaultCoercionMap`  | Custom per-type value coercion functions                                      |
| `messages`        | `ValidationMessages`                                  | `undefined`           | Custom validation error messages                                              |
| `ref`             | `React.Ref<AutoFormHandle>`                           | `undefined`           | Imperative handle for programmatic control                                    |
| `persistKey`      | `string`                                              | `undefined`           | When set, form values auto-save to storage under this key                     |
| `persistDebounce` | `number`                                              | `300`                 | Debounce interval in ms for persistence writes                                |
| `persistStorage`  | `PersistStorage`                                      | `localStorage`        | Custom storage adapter (must implement `getItem`/`setItem`/`removeItem`)      |
| `onValuesChange`  | `(values: z.infer<TSchema>) => void`                  | `undefined`           | Called on every field change with the full current form values                |
| `labels`          | `FormLabels`                                          | `{}`                  | Override hard-coded UI text (submit button, array buttons) for i18n           |

### `createForm(schema)` / `UniForm`

`createForm` wraps a Zod schema in a `UniForm` instance. Pass the result to `<AutoForm form={...}>`.

The main reason to use `UniForm` over passing a bare schema is typed `onChange` handlers: you can react to individual field changes, read the new value (typed to the schema), and call any form method — all outside React.

```tsx
import { createForm, AutoForm } from '@uniform/core'

const addressForm = createForm(addressSchema)
  .onChange('country', (value, ctx) => {
    // value is typed as the 'country' field type
    ctx.setFieldMeta('state', { hidden: value !== 'US' })
  })
  .onChange('country', (value, ctx) => {
    // multiple handlers on the same field are all called, in registration order
    ctx.setValue('state', undefined)
  })

// In component:
<AutoForm form={addressForm} onSubmit={handleSubmit} />
```

#### `UniForm.onChange(field, handler)`

Attach a typed onChange handler for a specific field. Returns `this` for chaining. Multiple calls for the same field accumulate handlers — all are fired in registration order.

**Handler receives:**

- `value` — the new field value, typed to the schema
- `ctx: UniFormContext` — all `FormMethods` plus `setFieldMeta`

> **Important:** Call `.onChange` at module level or inside `useMemo` — never during render. Each call appends a new handler, so calling it on every render silently stacks duplicates. See [docs/uniform-subscribe.md](docs/uniform-subscribe.md) for the planned `subscribe` API that handles dynamic/React use safely.

#### `UniFormContext`

The context passed to every `onChange` handler. Extends `FormMethods` with:

| Method                      | Description                                                                                                                                                                      |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setFieldMeta(field, meta)` | Dynamically override per-field UI properties (`hidden`, `disabled`, `options`, `label`, `placeholder`, `description`). Pass `value` to immediately call `setValue` on the field. |

All standard `FormMethods` are also available: `setValue`, `setValues`, `getValues`, `resetField`, `reset`, `setError`, `setErrors`, `clearErrors`, `submit`, `focus`.

#### `UniForm.condition(field, predicate)`

Attach a typed visibility condition for a specific field. The field is shown when `predicate(values)` returns `true`. Takes precedence over any `condition` set via the `fields` prop.

```ts
const form = createForm(schema).condition(
  'companyName',
  (values) => values.type === 'business',
)
```

### `createAutoForm(config)`

Factory function that returns a pre-configured `<AutoForm>` component with baked-in defaults.

```tsx
import { createAutoForm } from '@uniform/core'

const MyAutoForm = createAutoForm({
  components: { string: MyTextInput, number: MyNumberInput },
  fieldWrapper: MyFieldWrapper,
  layout: { submitButton: MySubmitButton },
  classNames: { form: 'my-form', label: 'my-label' },
  disabled: false,
  coercions: { number: (v) => (v === '' ? undefined : Number(v)) },
  messages: { required: 'This field is required' },
})

// Use it — no need to pass components/layout/classNames every time
<MyAutoForm form={myForm} onSubmit={handleSubmit} />

// Instance props merge with and override factory defaults
<MyAutoForm form={myForm} onSubmit={handleSubmit} classNames={{ form: 'override' }} />
```

**Config type:** `AutoFormConfig`

| Key            | Type                                     | Merge behavior                                   |
| -------------- | ---------------------------------------- | ------------------------------------------------ |
| `components`   | `ComponentRegistry`                      | Deep merge (instance overrides specific keys)    |
| `fieldWrapper` | `React.ComponentType<FieldWrapperProps>` | Instance replaces factory                        |
| `layout`       | `LayoutSlots`                            | Shallow merge                                    |
| `classNames`   | `FormClassNames`                         | Shallow merge                                    |
| `disabled`     | `boolean`                                | OR logic (either `true` → disabled)              |
| `coercions`    | `CoercionMap`                            | Shallow merge                                    |
| `messages`     | `ValidationMessages`                     | Shallow merge                                    |
| `labels`       | `FormLabels`                             | Shallow merge (instance overrides specific keys) |

### Types

#### `FieldMeta`

Metadata attached to each field, extracted from Zod's `.meta()` or set via the `fields` prop:

```ts
type FieldMeta = {
  label?: string
  placeholder?: string
  description?: string
  section?: string // Group field into a named section
  order?: number // Control render order
  span?: number // Grid column hint (set as --field-span CSS var)
  hidden?: boolean // Hide the field
  disabled?: boolean // Disable the field
  options?: SelectOption[] // Override options for select fields
  condition?: (values: Record<string, unknown>) => boolean // Show/hide conditionally
  component?: string | React.ComponentType<FieldProps>
  //          ^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          registry key        direct component (bypasses registry)
  onChange?: (value: unknown, form: FormMethods) => void // Per-field change handler
  [key: string]: unknown // Extensible
}
```

#### `FieldOverride`

The type for entries in the `fields` prop. Like `FieldMeta`, but with typed `condition` and `onChange`:

```ts
type FieldOverride<TSchema, TValue> = Partial<FieldMetaBase> & {
  condition?: (values: z.infer<TSchema>) => boolean
  onChange?: (value: TValue, form: FormMethods<z.infer<TSchema>>) => void
  [key: string]: unknown
}
```

#### `ComponentRegistry`

Map field types to React components:

```ts
type ComponentRegistry = {
  string?: React.ComponentType<FieldProps>
  number?: React.ComponentType<FieldProps>
  boolean?: React.ComponentType<FieldProps>
  date?: React.ComponentType<FieldProps>
  select?: React.ComponentType<FieldProps>
  textarea?: React.ComponentType<FieldProps>
  [key: string]: React.ComponentType<FieldProps> | undefined
}
```

#### `FieldProps`

Props received by every field component:

```ts
type FieldProps = {
  name: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  ref: RefCallBack // react-hook-form ref for DOM registration
  label: string
  placeholder?: string
  description?: string
  error?: string
  required: boolean
  disabled?: boolean
  options?: SelectOption[] // For select fields
  meta: FieldMeta
}
```

#### `FieldWrapperProps`

Props received by the field wrapper component:

```ts
type FieldWrapperProps = {
  children: React.ReactNode
  field: FieldConfig
  error?: string
  span?: number
  index?: number // Zero-based render index → --field-index CSS var
  depth?: number // Nesting depth (0 = top-level) → --field-depth CSS var
}
```

#### `FormMethods`

All programmatic form control methods — available on `UniFormContext`, in per-field `onChange` callbacks, and as `AutoFormHandle` via `ref`:

```ts
type FormMethods<TValues> = {
  setValue: (name, value) => void
  setValues: (values: Partial<TValues>) => void
  getValues: () => TValues
  resetField: (name) => void
  reset: (values?: Partial<TValues>) => void
  setError: (name, message: string) => void
  setErrors: (errors: Partial<Record<string, string>>) => void
  clearErrors: (names?) => void
  submit: () => void
  focus: (fieldName) => void
}
```

#### `LayoutSlots`

```ts
type LayoutSlots = {
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper?: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  submitButton?: React.ComponentType<{ isSubmitting: boolean }>
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
}
```

#### `ArrayRowLayoutProps`

```ts
type ArrayRowLayoutProps = {
  children: React.ReactNode // The rendered form fields for this row
  buttons: {
    moveUp: React.ReactNode | null
    moveDown: React.ReactNode | null
    duplicate: React.ReactNode | null
    remove: React.ReactNode
    collapse: React.ReactNode | null
  }
  index: number
  rowCount: number
}
```

#### `FieldDependencyResult`

Return type of `ctx.setFieldMeta()` inside UniForm onChange handlers. All fields are optional — return only what you want to override:

```ts
type FieldDependencyResult = {
  options?: SelectOption[] // Override available options (for select fields)
  hidden?: boolean // Show or hide the field
  disabled?: boolean // Enable or disable the field
  label?: string // Override the field label
  placeholder?: string // Override the placeholder
  description?: string // Override the description
}
```

```ts
type FormClassNames = {
  form?: string
  fieldWrapper?: string
  label?: string
  description?: string
  error?: string
  arrayAdd?: string
  arrayRemove?: string
  arrayMove?: string
  arrayDuplicate?: string
  arrayCollapse?: string
}
```

#### `CoercionMap`

```ts
type CoercionMap = Record<string, (value: unknown) => unknown>
```

Default coercions: `number` (empty→`undefined`, else `Number()`), `date` (empty→`undefined`, else `new Date()`), `boolean` (`Boolean()`), `string` (`null`→`''`).

#### `ValidationMessages`

```ts
type ValidationMessages = {
  required?: string // Global required override
  [fieldName: string]: string | Record<string, string> | undefined
  //                   ^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^
  //                   catch-all  per-error-code map
}
```

## Recipes

### Custom Components

Replace the default input for any field type:

```tsx
function MyTextInput(props: FieldProps) {
  return (
    <input
      ref={props.ref}
      id={props.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      placeholder={props.placeholder}
      disabled={props.disabled}
      className='my-input'
    />
  )
}

;<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  components={{ string: MyTextInput }}
/>
```

### Per-field Custom Components

You can override the component for a **single field** in two ways:

#### Option 1 — Direct React component (inline, no registry needed)

Pass a `React.ComponentType<FieldProps>` directly as `meta.component` — either in the Zod schema or via the `fields` prop:

```tsx
// In the Zod schema
function StarRating(props: FieldProps) { /* ... */ }

const schema = z.object({
  title: z.string(),
  rating: z.number().min(1).max(5).meta({ component: StarRating }),
})

<AutoForm form={createForm(schema)} onSubmit={handleSubmit} />
```

```tsx
// Or via the fields prop (no schema change needed)
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  fields={{ rating: { component: StarRating } }}
/>
```

The direct component **bypasses the registry entirely** and takes highest priority in the resolution chain.

#### Array fields with a direct component

A direct `meta.component` also bypasses the default `ArrayField` row-by-row UI. This lets you use a fully custom multi-value widget (e.g. a tag picker, multi-select) on a `z.array(z.string())` field — the component owns the whole array value:

```tsx
function TagPicker(props: FieldProps) {
  const selected = Array.isArray(props.value) ? (props.value as string[]) : []
  // ... render your chip UI, call props.onChange(newArray) on changes
}

const schema = z.object({
  tags: z
    .array(z.string())
    .min(1, 'Pick at least one tag')
    .meta({
      component: TagPicker,
      suggestions: ['React', 'TypeScript', 'Zod'],
    }),
})

<AutoForm form={createForm(schema)} onSubmit={handleSubmit} />
```

Zod still validates the array (`.min(1)` etc.) — only the _render_ is taken over by your component.

#### Option 2 — Named key in the registry

Register a component under a custom string key — either in `createAutoForm` or the `components` prop — then reference it with `meta.component: 'yourKey'`:

```tsx
// Register at factory level, available to all forms
const AppAutoForm = createAutoForm({
  components: {
    colorpicker: ColorPicker,
    autocomplete: AutocompleteInput,
  },
})

const schema = z.object({
  theme: z.string().meta({ component: 'colorpicker' }),
  city: z.string().meta({ component: 'autocomplete' }),
})

<AppAutoForm form={createForm(schema)} onSubmit={handleSubmit} />
```

```tsx
// Or register per-instance via the components prop
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  components={{ colorpicker: ColorPicker }}
  fields={{ theme: { component: 'colorpicker' } }}
/>
```

**Resolution priority** (highest → lowest):

1. Direct React component in `meta.component`
2. String key in `meta.component` → merged registry
3. Field type key in merged registry (e.g. `string`, `number`)
4. Field type key in default registry
5. Warn + render nothing

### Field onChange Handlers

React to individual field changes — inline via the `fields` prop (typed to the schema), or statically via `UniForm.onChange`.

#### Inline via `fields` prop

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  fields={{
    country: {
      onChange: (value, form) => {
        // value is typed as the 'country' field type
        // form provides setValue, setValues, getValues, reset, etc.
        form.setValue('state', undefined)
      },
    },
  }}
/>
```

#### Statically via `createForm` / `UniForm` (outside the component)

```tsx
// Define once at module level — handlers are stable, no React rules apply
const addressForm = createForm(addressSchema).onChange(
  'country',
  (value, ctx) => {
    ctx.setFieldMeta('state', { hidden: value !== 'US' })
    ctx.setValue('state', undefined)
  },
)

function MyForm() {
  return <AutoForm form={addressForm} onSubmit={handleSubmit} />
}
```

`UniForm.onChange` also supports `ctx.setFieldMeta` for dynamic field overrides — not available in the inline `fields` version.

### Grid Layout with `classNames` and `span`

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  classNames={{
    form: 'grid grid-cols-12 gap-4',
    fieldWrapper: 'p-2',
    label: 'font-semibold block mb-1',
    error: 'text-red-500 text-sm',
  }}
  fields={{
    firstName: { span: 6 },
    lastName: { span: 6 },
    email: { span: 12 },
  }}
/>
```

The `span` value is set as `--field-span` CSS custom property on each field wrapper. Each wrapper also receives `--field-index` (zero-based render order) and `--field-depth` (nesting depth). Use CSS Grid to consume them:

```css
.grid > * {
  grid-column: span var(--field-span, 12);
}
/* Style every other top-level field */
.grid > *:nth-child(even) {
  background: var(--field-index);
}
```

### Section Grouping

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  fields={{
    firstName: { section: 'Personal', order: 1 },
    lastName: { section: 'Personal', order: 2 },
    street: { section: 'Address', order: 3 },
    city: { section: 'Address', order: 4 },
  }}
  layout={{
    sectionWrapper: ({ children, title }) => (
      <fieldset>
        <legend>{title}</legend>
        {children}
      </fieldset>
    ),
  }}
/>
```

### Conditional Fields

Show a field only when another field has a specific value:

```tsx
const schema = z.object({
  type: z.enum(['personal', 'business']),
  companyName: z.string().optional(),
})

const myForm = createForm(schema)
  // Attach condition on the UniForm instance (takes precedence over fields prop):
  .condition('companyName', (values) => values.type === 'business')

// Or via the fields prop:
<AutoForm
  form={createForm(schema)}
  onSubmit={handleSubmit}
  fields={{
    companyName: {
      condition: (values) => values.type === 'business',
    },
  }}
/>
```

### Discriminated Unions

Pass a `z.discriminatedUnion` directly to `createForm` — no flat schema needed:

```tsx
import * as z from 'zod/v4'
import { createForm, AutoForm } from '@uniform/core'

const notificationUnion = z.discriminatedUnion('channel', [
  z.object({
    channel: z.literal('email'),
    recipientEmail: z.string().email('Must be a valid email'),
    subject: z.string().min(1, 'Subject is required'),
  }),
  z.object({
    channel: z.literal('sms'),
    phoneNumber: z
      .string()
      .regex(/^\+?[1-9]\d{7,14}$/, 'Must be a valid phone number'),
    messageBody: z.string().max(160, 'SMS body must be ≤ 160 chars'),
  }),
  z.object({
    channel: z.literal('webhook'),
    endpointUrl: z.string().url('Must be a valid URL'),
    secret: z.string().min(16, 'Secret must be at least 16 characters'),
  }),
])

const notificationForm = createForm(notificationUnion)

function NotificationForm() {
  return (
    <AutoForm
      form={notificationForm}
      defaultValues={{ channel: 'email' }}
      onSubmit={(values) => console.log(values)}
    />
  )
}
```

**How it works:**

- The discriminator field (`channel`) renders as a `select` with one option per variant
- When the discriminator changes, AutoForm swaps to the matching variant and renders only that variant's fields
- Validation uses the original union schema via `zodResolver` — only the active variant's fields are validated
- **Shared fields** (same key in multiple variants) persist their values when switching variants, since react-hook-form retains unregistered field values by default
- Variant-specific field values from a previous variant remain in the form store but are stripped by Zod during parsing

### Custom Validation Messages

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  messages={{
    required: 'This field is required', // Global
    email: 'Please provide an email', // Per-field catch-all
    age: { too_small: 'Must be at least 18' }, // Per-field per-code
  }}
/>
```

Resolution order: per-field per-code → per-field string → global `required` → Zod's original message.

#### `AutoFormHandle`

Imperative handle exposed via `ref` (same as `FormMethods`):

```ts
type AutoFormHandle<TSchema> = FormMethods<z.infer<TSchema>>
// i.e.: reset, submit, setValue, setValues, getValues, resetField,
//       setError, setErrors, clearErrors, focus
```

#### `PersistStorage`

Adapter interface for form persistence (defaults to `localStorage`):

```ts
type PersistStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}
```

### Factory Pattern with `createAutoForm`

```tsx
import { createAutoForm, createForm } from '@uniform/core'

const AppAutoForm = createAutoForm({
  components: {
    string: MyTextInput,
    number: MyNumberInput,
    boolean: MyToggle,
    select: MyDropdown,
  },
  fieldWrapper: MyFieldWrapper,
  layout: { submitButton: MySubmitButton },
  classNames: { form: 'app-form', label: 'app-label' },
})

// Then use it everywhere — no prop repetition
<AppAutoForm form={createForm(userSchema)} onSubmit={saveUser} />
<AppAutoForm form={createForm(settingsSchema)} onSubmit={saveSettings} />
```

### Deep Field Overrides

Override metadata for nested fields using dot-notated paths:

```tsx
const schema = z.object({
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string(),
  }),
})

<AutoForm
  form={createForm(schema)}
  onSubmit={handleSubmit}
  fields={{
    'address.street': { placeholder: '123 Main St' },
    'address.city': { label: 'City / Town' },
    'address.zip': { span: 6 },
  }}
/>
```

### Programmatic Control via Ref

Use `ref` to control the form from outside — ideal for wizards, external save buttons, and multi-step flows:

```tsx
import { useRef } from 'react'
import { AutoForm } from '@uniform/core'
import type { AutoFormHandle } from '@uniform/core'

function WizardForm() {
  const formRef = useRef<AutoFormHandle<typeof schema>>(null)

  return (
    <div>
      <AutoForm ref={formRef} form={myForm} onSubmit={handleSubmit} />

      <button onClick={() => formRef.current?.reset()}>Reset</button>
      <button onClick={() => formRef.current?.submit()}>Save (external)</button>
      <button onClick={() => formRef.current?.setValues({ name: 'Alice' })}>
        Pre-fill
      </button>
    </div>
  )
}
```

All `AutoFormHandle` methods: `reset()`, `submit()`, `setValue()`, `setValues()`, `getValues()`, `resetField()`, `setError()`, `setErrors()`, `clearErrors()`, `focus()`.

### Form State Persistence

Auto-save form values to storage so users don't lose progress on page reload:

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  persistKey='my-form'
  persistDebounce={500}
/>
```

Values are restored on mount and cleared after a successful submit. Use `persistStorage` for a custom adapter (e.g. `sessionStorage`):

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  persistKey='my-form'
  persistStorage={sessionStorage}
/>
```

### Enhanced Array Fields

Array fields support reordering, duplication, and collapsible rows — all **opt-in** via meta flags:

```tsx
const schema = z.object({
  members: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }),
  ).min(1).max(5), // Enforced: can't remove below 1, can't add above 5
})

<AutoForm
  form={createForm(schema)}
  onSubmit={handleSubmit}
  fields={{
    members: {
      movable: true,      // Show ↑/↓ move buttons
      duplicable: true,   // Show Duplicate button
      collapsible: true,  // Show collapse/expand toggle (object items only)
    },
  }}
/>
```

- **`movable`**: Renders Move Up / Move Down buttons (only when >1 row)
- **`duplicable`**: Renders a Duplicate button (hidden when at maxItems)
- **`collapsible`**: Renders a collapse/expand toggle for object rows with summary text
- **Add** and **Remove** are always shown
- Constraints from `.min()` / `.max()` are enforced — "Add" is disabled at max, "Remove" is disabled at min

Style the array buttons via `classNames`:

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  fields={{ members: { movable: true, duplicable: true, collapsible: true } }}
  classNames={{
    arrayAdd: 'btn btn-primary',
    arrayRemove: 'btn btn-danger',
    arrayMove: 'btn btn-secondary',
    arrayDuplicate: 'btn btn-outline',
    arrayCollapse: 'btn btn-ghost',
  }}
/>
```

### Custom Array Row Layout

Use `layout.arrayRowLayout` to control where buttons appear within each array row:

```tsx
import type { ArrayRowLayoutProps } from '@uniform/core'

function HorizontalRowLayout({
  children,
  buttons,
  index,
  rowCount,
}: ArrayRowLayoutProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {buttons.moveUp}
        {buttons.moveDown}
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {buttons.duplicate}
        {buttons.remove}
      </div>
    </div>
  )
}

;<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  fields={{ tasks: { movable: true, duplicable: true } }}
  layout={{ arrayRowLayout: HorizontalRowLayout }}
/>
```

The default layout renders collapse toggle, then children, then all action buttons in a row.

### Customizing UI Text (i18n)

Use the `labels` prop to replace every hard-coded string in the default UI — submit button, all array action buttons — without needing to replace entire layout slot components:

```tsx
<AutoForm
  form={myForm}
  onSubmit={handleSubmit}
  labels={{
    submit: 'Enviar',
    arrayAdd: 'Agregar fila',
    arrayRemove: 'Eliminar',
    arrayMoveUp: '⬆ Subir',
    arrayMoveDown: '⬇ Bajar',
    arrayDuplicate: 'Duplicar',
    arrayCollapse: '▼ Ocultar', // shown when row is expanded
    arrayExpand: '▶ Mostrar', // shown when row is collapsed
  }}
/>
```

Set factory-level defaults with `labels` in `createAutoForm` — per-instance `labels` props shallow-merge and override:

```tsx
const AppAutoForm = createAutoForm({
  labels: { submit: 'Save' },
})

// Uses factory default "Save"
<AppAutoForm form={myForm} onSubmit={handleSubmit} />

// Per-instance override wins → "Save & Close"
<AppAutoForm form={myForm} onSubmit={handleSubmit} labels={{ submit: 'Save & Close' }} />
```

**`FormLabels` type reference:**

```ts
type FormLabels = {
  submit?: string // default: "Submit"
  arrayAdd?: string // default: "Add"
  arrayRemove?: string // default: "Remove"
  arrayMoveUp?: string // default: "↑"
  arrayMoveDown?: string // default: "↓"
  arrayDuplicate?: string // default: "Duplicate"
  arrayCollapse?: string // shown when row is expanded (default: "▼")
  arrayExpand?: string // shown when row is collapsed (default: "▶")
}
```

All unspecified keys fall back to their built-in English defaults. `labels` only affects the **default** submit button and array controls — if you supply a custom `layout.submitButton` component, that component owns its own text.

### Value Cascade (`onValuesChange`)

Use `onValuesChange` together with a `ref` to set one field based on another:

```tsx
const formRef = useRef<AutoFormHandle<typeof schema>>(null)

<AutoForm
  ref={formRef}
  form={myForm}
  onSubmit={handleSubmit}
  onValuesChange={(values) => {
    const seats = { free: 1, starter: 5, pro: 20, enterprise: 100 }[values.plan]
    if (seats !== undefined && values.seats !== seats) {
      formRef.current?.setValues({ seats })
    }
  }}
/>
```

**Always guard with an equality check** to prevent an infinite update loop.

> **Tip:** For simple field-to-field reactions (resetting, toggling visibility), prefer `UniForm.onChange` or the `fields` prop `onChange` — they're more ergonomic and fully typed. Use `onValuesChange` when you need to observe the entire form state holistically.

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build @uniform/core
pnpm test          # Run all tests
pnpm dev           # Start the playground dev server
```

### Monorepo Structure

```
uniform/
├── packages/
│   └── core/          # The library (@uniform/core)
└── apps/
    └── playground/    # Vite + React dev app
```

### Tech Stack

- **pnpm workspaces** — monorepo management
- **tsup** — library bundler (ESM + CJS + `.d.ts`)
- **Vite** — playground dev server
- **Vitest** — unit and integration tests
- **TypeScript** — strict mode throughout
- **Zod V4** (`zod@>=3.25`, imported from `zod/v4`)
- **react-hook-form** — form state management
- **@hookform/resolvers** (`^5.2`) — Zod v4-aware resolver

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run tests (`pnpm test`) and ensure they pass
4. Submit a pull request

## License

[MIT](LICENSE)

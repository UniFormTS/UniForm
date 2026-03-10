# UniForm

> Headless React + Zod V4 form library. Zero styles — bring your own components.

UniForm takes a Zod schema and automatically renders a fully customizable form. It handles introspection, validation, coercion, and layout — you provide the components and styling.

## Features

- **Schema-driven** — define your form once with Zod V4, get inputs, labels, validation, and types for free
- **Headless** — zero CSS, zero opinions; bring your own design system
- **Full Zod V4 support** — scalars, enums, objects, arrays, optionals, nullables, defaults, pipes/transforms, unions, discriminated unions
- **react-hook-form** under the hood — performant, uncontrolled forms with `zodResolver`
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
- **Field dependencies** — `meta.depend` reactively overrides a field's `options`, `hidden`, `disabled`, `label`, `placeholder`, or `description` based on other field values (country → state cascade, dynamic labels, etc.)
- **Value cascade** — `onValuesChange` fires on every change with the full form values; use with `ref.setValues()` to imperatively sync field values
- **Tree-shakeable** — ESM + CJS builds via tsup with `sideEffects: false`

## Quick Start

### Installation

```bash
npm install @uniform/core react react-hook-form zod
```

### Basic Usage

```tsx
import * as z from 'zod/v4'
import { AutoForm } from '@uniform/core'

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  age: z.number().min(0).optional(),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

function MyForm() {
  return (
    <AutoForm
      schema={schema}
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

| Prop              | Type                                                  | Default               | Description                                                                 |
| ----------------- | ----------------------------------------------------- | --------------------- | --------------------------------------------------------------------------- |
| `schema`          | `z.ZodObject`                                         | _required_            | The Zod V4 object schema that defines the form                              |
| `onSubmit`        | `(values: z.infer<TSchema>) => void \| Promise<void>` | _required_            | Called with fully typed, validated values on successful submit              |
| `defaultValues`   | `Partial<z.infer<TSchema>>`                           | `{}`                  | Pre-fill form fields                                                        |
| `components`      | `ComponentRegistry`                                   | `defaultRegistry`     | Override field type → component mapping                                     |
| `fields`          | `Record<string, Partial<FieldMeta>>`                  | `{}`                  | Per-field metadata overrides (supports dot-notated paths for nested fields) |
| `fieldWrapper`    | `React.ComponentType<FieldWrapperProps>`              | `DefaultFieldWrapper` | Wrap each scalar field in a custom container                                |
| `layout`          | `LayoutSlots`                                         | `{}`                  | Replace form wrapper, section wrapper, submit button, or array row layout   |
| `classNames`      | `FormClassNames`                                      | `{}`                  | CSS class names for form, field wrappers, labels, errors, descriptions      |
| `disabled`        | `boolean`                                             | `false`               | Disable all form fields and the submit button                               |
| `coercions`       | `CoercionMap`                                         | `defaultCoercionMap`  | Custom per-type value coercion functions                                    |
| `messages`        | `ValidationMessages`                                  | `undefined`           | Custom validation error messages                                            |
| `ref`             | `React.Ref<AutoFormHandle>`                           | `undefined`           | Imperative handle for programmatic control                                  |
| `persistKey`      | `string`                                              | `undefined`           | When set, form values auto-save to storage under this key                   |
| `persistDebounce` | `number`                                              | `300`                 | Debounce interval in ms for persistence writes                              |
| `persistStorage`  | `PersistStorage`                                      | `localStorage`        | Custom storage adapter (must implement `getItem`/`setItem`/`removeItem`)    |
| `onValuesChange`  | `(values: z.infer<TSchema>) => void`                  | `undefined`           | Called on every field change with the full current form values              |

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
<MyAutoForm schema={schema} onSubmit={handleSubmit} />

// Instance props merge with and override factory defaults
<MyAutoForm schema={schema} onSubmit={handleSubmit} classNames={{ form: 'override' }} />
```

**Config type:** `AutoFormConfig`

| Key            | Type                                     | Merge behavior                                |
| -------------- | ---------------------------------------- | --------------------------------------------- |
| `components`   | `ComponentRegistry`                      | Deep merge (instance overrides specific keys) |
| `fieldWrapper` | `React.ComponentType<FieldWrapperProps>` | Instance replaces factory                     |
| `layout`       | `LayoutSlots`                            | Shallow merge                                 |
| `classNames`   | `FormClassNames`                         | Shallow merge                                 |
| `disabled`     | `boolean`                                | OR logic (either `true` → disabled)           |
| `coercions`    | `CoercionMap`                            | Shallow merge                                 |
| `messages`     | `ValidationMessages`                     | Shallow merge                                 |

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
  condition?: (values: Record<string, unknown>) => boolean // Show/hide conditionally
  depend?: (values: Record<string, unknown>) => FieldDependencyResult // Reactive overrides
  component?: string | React.ComponentType<FieldProps>
  //          ^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          registry key        direct component (bypasses registry)
  [key: string]: unknown // Extensible
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

Return type of `FieldMeta.depend`. All fields are optional — return only what you want to override:

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
  schema={schema}
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

<AutoForm schema={schema} onSubmit={handleSubmit} />
```

```tsx
// Or via the fields prop (no schema change needed)
<AutoForm
  schema={schema}
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

<AutoForm schema={schema} onSubmit={handleSubmit} />
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

<AppAutoForm schema={schema} onSubmit={handleSubmit} />
```

```tsx
// Or register per-instance via the components prop
<AutoForm
  schema={schema}
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

### Grid Layout with `classNames` and `span`

```tsx
<AutoForm
  schema={schema}
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

The `span` value is set as `--field-span` CSS custom property on each field wrapper. Use CSS Grid to consume it:

```css
.grid > * {
  grid-column: span var(--field-span, 12);
}
```

### Section Grouping

```tsx
<AutoForm
  schema={schema}
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

<AutoForm
  schema={schema}
  onSubmit={handleSubmit}
  fields={{
    companyName: {
      condition: (values) => values.type === 'business',
    },
  }}
/>
```

### Custom Validation Messages

```tsx
<AutoForm
  schema={schema}
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

Imperative handle exposed via `ref`:

```ts
type AutoFormHandle<TValues = Record<string, unknown>> = {
  reset: (values?: Partial<TValues>) => void
  submit: () => void
  setValues: (values: Partial<TValues>) => void
  getValues: () => TValues
  setErrors: (errors: Record<string, string>) => void
  clearErrors: (fieldNames?: string[]) => void
  focus: (fieldName: string) => void
}
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
import { createAutoForm } from '@uniform/core'

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
<AppAutoForm schema={userSchema} onSubmit={saveUser} />
<AppAutoForm schema={settingsSchema} onSubmit={saveSettings} />
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
  schema={schema}
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
  const formRef = useRef<AutoFormHandle>(null)

  return (
    <div>
      <AutoForm ref={formRef} schema={schema} onSubmit={handleSubmit} />

      <button onClick={() => formRef.current?.reset()}>Reset</button>
      <button onClick={() => formRef.current?.submit()}>Save (external)</button>
      <button onClick={() => formRef.current?.setValues({ name: 'Alice' })}>
        Pre-fill
      </button>
    </div>
  )
}
```

All `AutoFormHandle` methods: `reset()`, `submit()`, `setValues()`, `getValues()`, `setErrors()`, `clearErrors()`, `focus()`.

### Form State Persistence

Auto-save form values to storage so users don't lose progress on page reload:

```tsx
<AutoForm
  schema={schema}
  onSubmit={handleSubmit}
  persistKey='my-form'
  persistDebounce={500}
/>
```

Values are restored on mount and cleared after a successful submit. Use `persistStorage` for a custom adapter (e.g. `sessionStorage`):

```tsx
<AutoForm
  schema={schema}
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
  schema={schema}
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

````tsx
<AutoForm
  schema={schema}
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

### Custom Array Row Layout

Use `layout.arrayRowLayout` to control where buttons appear within each array row:

```tsx
import type { ArrayRowLayoutProps } from '@uniform/core'

function HorizontalRowLayout({ children, buttons, index, rowCount }: ArrayRowLayoutProps) {
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

<AutoForm
  schema={schema}
  onSubmit={handleSubmit}
  fields={{ tasks: { movable: true, duplicable: true } }}
  layout={{ arrayRowLayout: HorizontalRowLayout }}
/>
```

The default layout renders collapse toggle, then children, then all action buttons in a row.

### Field Dependencies (`depend`)

Use `meta.depend` to reactively override a field's options, visibility, disabled state, or metadata based on other field values:

```tsx
const schema = z.object({
  country: z.enum(['us', 'ca']),
  state: z.enum(['ca', 'ny', 'on', 'qc']),
})

<AutoForm
  schema={schema}
  onSubmit={handleSubmit}
  fields={{
    state: {
      depend: (values) => ({
        // Filter state options based on selected country
        options:
          values.country === 'ca'
            ? [{ label: 'Ontario', value: 'on' }, { label: 'Quebec', value: 'qc' }]
            : [{ label: 'California', value: 'ca' }, { label: 'New York', value: 'ny' }],
      }),
    },
  }}
/>
```

Other `depend` use cases:

```tsx
fields={{
  companyName: {
    depend: (values) => ({ hidden: values.type !== 'company' }),
  },
  notes: {
    depend: (values) => ({ disabled: values.isLocked === true }),
  },
  quantity: {
    depend: (values) => ({
      label: `Quantity (${String(values.unit ?? 'units')})`,
      placeholder: values.unit === 'kg' ? '0.0' : '0',
    }),
  },
}}
```

> **Tip:** `depend` is evaluated on every change. Guards like `values.country === 'ca'` make it efficient. For **value** cascade (resetting field B when A changes), use `onValuesChange` + `ref.setValues()` instead.

### Value Cascade (`onValuesChange`)

Use `onValuesChange` together with a `ref` to set one field based on another:

```tsx
const formRef = useRef<AutoFormHandle<z.infer<typeof schema>>>(null)

<AutoForm
  ref={formRef}
  schema={schema}
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

## Development

```bash
pnpm install       # Install dependencies
pnpm build         # Build @uniform/core
pnpm test          # Run all tests
pnpm dev           # Start the playground dev server
````

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

---
title: TypeScript API
sidebar_position: 4
---

# TypeScript API

All public types are re-exported from `@uniform-ts/core`.

```ts
import type {
  AutoFormProps,
  AutoFormHandle,
  UniForm,
  UniFormContext,
  FieldOverride,
  LayoutSlots,
  ResolvedLayoutSlots,
  ComponentRegistry,
  FieldProps,
  FieldWrapperProps,
  ArrayRowLayoutProps,
  FormClassNames,
  ValidationMessages,
  FormLabels,
  CoercionMap,
  PersistStorage,
  FormMethods,
} from '@uniform-ts/core'
```

---

## `AutoFormProps<TSchema>`

The full set of props accepted by `<AutoForm>`.

```ts
type AutoFormProps<TSchema extends z.$ZodObject> = {
  form: { readonly schema: TSchema }
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  defaultValues?:
    | Partial<z.infer<TSchema>>
    | (() => Promise<Partial<z.infer<TSchema>>>)
  components?: ComponentRegistry
  fields?: { [K in DeepKeys<z.infer<TSchema>>]?: FieldOverride<TSchema, ...> }
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
  persistKey?: string
  persistDebounce?: number
  persistStorage?: PersistStorage
  onValuesChange?: (values: z.infer<TSchema>) => void
  labels?: FormLabels
}
```

---

## `AutoFormHandle<TSchema>`

The object exposed via `React.useRef<AutoFormHandle>`. Extends the library's own `FormMethods` (not RHF's `UseFormReturn` directly).

```ts
type AutoFormHandle<TSchema extends z.$ZodObject> = FormMethods<
  z.infer<TSchema>
> & {
  isSubmitting: boolean
}
```

See [`FormMethods`](#formmethods) below for the full method list.

---

## `UniForm<TSchema>`

The object returned by `createForm()`.

```ts
type UniForm<TSchema extends z.$ZodObject> = {
  schema: TSchema
  setOnChange: (
    field: DeepKeys<z.infer<TSchema>>,
    handler: (
      value: FieldValue,
      ctx: UniFormContext<TSchema>,
    ) => void | Promise<void>,
  ) => UniForm<TSchema>
  setCondition: (
    field: DeepKeys<z.infer<TSchema>>,
    predicate: (values: z.infer<TSchema>) => boolean,
  ) => UniForm<TSchema>
}
```

---

## `UniFormContext<TSchema>`

Passed as the second argument to every `setOnChange` handler. Extends all [`FormMethods`](#formmethods) and adds `setFieldMeta`.

```ts
type UniFormContext<TSchema extends z.$ZodObject> = FormMethods<
  z.infer<TSchema>
> & {
  setFieldMeta: (
    field: DeepKeys<z.infer<TSchema>>,
    meta: Partial<FieldDependencyResult>,
  ) => void
}
```

| Property       | Type                                                    | Description                                                  |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| `setFieldMeta` | `(field, meta: Partial<FieldDependencyResult>) => void` | Dynamically override a field's label/options/disabled/hidden |
| _…FormMethods_ | see below                                               | All `FormMethods` are available (setValue, reset, etc.)      |

---

## `FieldOverride`

Per-field metadata override passed via the `fields` prop. All properties are optional.

```ts
type FieldOverride = {
  label?: string
  description?: string
  placeholder?: string
  order?: number
  span?: number // 1–12 column span in 12-col grid
  section?: string // Group into a named section
  hidden?: boolean // Hard-hide (never renders, never validates)
  disabled?: boolean
  component?: string | React.ComponentType<FieldProps> // Registry key or inline component
  options?: Array<{ label: string; value: string | number }>
  condition?: (values: z.infer<TSchema>) => boolean // Inline conditional visibility
  onChange?: (value: FieldValue, form: FormMethods) => void | Promise<void>
  // Array-field specific:
  movable?: boolean // Enable move-up/move-down row controls
  duplicable?: boolean // Enable duplicate row button
  collapsible?: boolean // Enable collapse/expand per row
}
```

---

## `LayoutSlots`

Slots for replacing structural chrome components.

```ts
type LayoutSlots = {
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper?: React.ComponentType<{
    title: string
    children: React.ReactNode
  }>
  submitButton?: React.ComponentType<{ isSubmitting: boolean; label: string }>
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
  loadingFallback?: React.ReactNode
}
```

:::note
`formWrapper` receives only `children` — the `<form>` element and its `onSubmit` handler are managed by `<AutoForm>` itself, outside the wrapper.
:::

---

## `ArrayRowLayoutProps`

Props passed to custom `arrayRowLayout` components. Buttons are provided as pre-rendered `React.ReactNode` values — render them wherever you like.

```ts
type ArrayRowLayoutProps = {
  children: React.ReactNode
  buttons: {
    moveUp: React.ReactNode | null // null when already first row
    moveDown: React.ReactNode | null // null when already last row
    duplicate: React.ReactNode | null // null when at maxItems
    remove: React.ReactNode
    collapse: React.ReactNode | null // null when collapsible is disabled
  }
  index: number // zero-based row index
  rowCount: number // total number of rows
}
```

---

## `ComponentRegistry`

Maps field-type keys to React components (`React.ComponentType<FieldProps>`).

```ts
type ComponentRegistry = {
  string?: React.ComponentType<FieldProps>
  number?: React.ComponentType<FieldProps>
  boolean?: React.ComponentType<FieldProps>
  date?: React.ComponentType<FieldProps>
  select?: React.ComponentType<FieldProps> // z.enum() / z.nativeEnum() fields
  textarea?: React.ComponentType<FieldProps> // opt-in via component: 'textarea'
  [key: string]: React.ComponentType<FieldProps> | undefined
}
```

:::note
Enum fields use the `select` key, not `enum`. The `array` and `object` keys are not part of the registry — those field types are handled internally.
:::

---

## `FieldProps`

The props passed to every custom field component. UniForm calls your component with these.

```ts
type FieldProps = {
  name: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  ref: RefCallBack
  label: string
  placeholder?: string
  description?: string
  error?: string
  required: boolean
  disabled?: boolean
  options?: SelectOption[]
  meta: FieldMeta // full field metadata, including any custom keys
}
```

---

## `FieldWrapperProps`

Props passed to the `fieldWrapper` component that surrounds every rendered field.

```ts
type FieldWrapperProps = {
  children: React.ReactNode
  field: FieldConfig
  error?: string
  span?: number
  index?: number // zero-based render index; also set as CSS var --field-index
  depth?: number // nesting depth (0 = top-level); also set as CSS var --field-depth
}
```

The default `fieldWrapper` exposes `index`, `depth`, and `span` as CSS custom properties (`--field-index`, `--field-depth`, `--field-span`) and sets `data-field-name`, `data-field-type`, `data-required`, `data-disabled`, `data-has-error`, and `data-has-description` attributes on the wrapper element. See [Layout & Styling — CSS variables and data attributes](../guides/layout#field-wrapper-css-variables) for details and examples.

---

## `FormMethods`

All programmatic form control methods, available on both `AutoFormHandle` (ref) and inside `setOnChange` handlers via `UniFormContext`.

```ts
type FormMethods<TValues> = {
  setValue: (name: FieldPath<TValues>, value: FieldPathValue<TValues, ...>) => void
  setValues: (values: Partial<TValues>) => void
  getValues: () => TValues
  resetField: (name: FieldPath<TValues>) => void
  reset: (values?: Partial<TValues>) => void
  setError: (name: FieldPath<TValues>, message: string) => void
  setErrors: (errors: Partial<Record<FieldPath<TValues>, string>>) => void
  clearErrors: (names?: FieldPath<TValues> | FieldPath<TValues>[]) => void
  submit: () => void
  focus: (fieldName: FieldPath<TValues>) => void
  watch: (() => TValues) &
    (<K extends FieldPath<TValues>>(name: K) => FieldPathValue<TValues, K>)
}
```

---

## `FormClassNames`

CSS class overrides for structural elements.

```ts
type FormClassNames = {
  form?: string
  fieldWrapper?: string
  label?: string
  description?: string
  error?: string
  // Array field button classes:
  arrayAdd?: string
  arrayRemove?: string
  arrayMove?: string
  arrayDuplicate?: string
  arrayCollapse?: string
}
```

---

## `ValidationMessages`

Override Zod validation error messages globally or per field.

```ts
type ValidationMessages = {
  /** Global fallback for required-field errors (Zod `too_small` / `invalid_type`) */
  required?: string
  /** Per-field overrides — value is either a single string for all errors on
   *  that field, or an object mapping Zod error codes to strings. */
  [fieldName: string]: string | Record<string, string> | undefined
}
```

See [Validation & Error Messages](../guides/validation) for usage examples.

---

## `FormLabels`

Override hard-coded UI strings.

```ts
type FormLabels = {
  submit?: string
  arrayAdd?: string // "Add" button label
  arrayRemove?: string // "Remove" button label
  arrayMoveUp?: string // "↑" button label
  arrayMoveDown?: string // "↓" button label
  arrayDuplicate?: string // "Duplicate" button label
  arrayCollapse?: string // collapse toggle label (when expanded)
  arrayExpand?: string // expand toggle label (when collapsed)
}
```

---

## `PersistStorage`

Interface for custom storage adapters. Must be synchronous (compatible with `localStorage` / `sessionStorage`).

```ts
type PersistStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}
```

The default implementation uses `sessionStorage`. Pass `persistStorage={localStorage}` to survive tab closes.

---

## `CoercionMap`

Per-field coercion functions applied before React Hook Form processes the value. Keyed by **field name** (not type name).

```ts
type CoercionMap = Record<string, (value: unknown) => unknown>
```

Example — coerce a specific field from string to number:

```ts
<AutoForm
  coercions={{ age: (v) => (v === '' ? undefined : Number(v)) }}
  ...
/>
```

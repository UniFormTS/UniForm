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
  SectionConfig,
  ComponentRegistry,
  FieldProps,
  FieldWrapperProps,
  FormWrapperProps,
  SectionWrapperProps,
  SubmitButtonProps,
  ObjectWrapperProps,
  ArrayWrapperProps,
  ArrayRowLayoutProps,
  ArrayFieldLayoutProps,
  ArrayButtonProps,
  ArrayCollapseButtonProps,
  ArrayButtonSlots,
  ResolvedArrayButtonSlots,
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

The object exposed via `React.useRef<AutoFormHandle>`. This is exactly [`FormMethods`](#formmethods) — no extra properties.

```ts
type AutoFormHandle<TSchema extends z.$ZodObject> = FormMethods<
  z.infer<TSchema>
>
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
  // Object / array field wrapper:
  wrapper?: React.ComponentType<ObjectWrapperProps | ArrayWrapperProps> // Per-field wrapper override
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
  formWrapper?: React.ComponentType<FormWrapperProps>
  sectionWrapper?: React.ComponentType<SectionWrapperProps>
  submitButton?: React.ComponentType<SubmitButtonProps> | null
  objectWrapper?: React.ComponentType<ObjectWrapperProps>
  arrayWrapper?: React.ComponentType<ArrayWrapperProps>
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
  arrayFieldLayout?: React.ComponentType<ArrayFieldLayoutProps>
  arrayButtons?: ArrayButtonSlots
  loadingFallback?: React.ReactNode
  sections?: Record<string, SectionConfig>
}
```

For omittable slots, `undefined` uses the built-in default while `null` omits rendering.

:::note
`formWrapper` receives only `children` — the `<form>` element and its `onSubmit` handler are managed by `<AutoForm>` itself, outside the wrapper.
:::

---

## `FormWrapperProps`

Props received by the `layout.formWrapper` component.

```ts
interface FormWrapperProps {
  children: React.ReactNode
}
```

---

## `SectionWrapperProps`

Props received by the `layout.sectionWrapper` component and by per-section `SectionConfig.component` overrides.

```ts
interface SectionWrapperProps {
  children: React.ReactNode
  title: string
  className?: string
}
```

---

## `SubmitButtonProps`

Props received by the `layout.submitButton` component.

```ts
interface SubmitButtonProps {
  isSubmitting: boolean
  label: string
}
```

---

## `ObjectWrapperProps`

Props received by the `layout.objectWrapper` component. Replaces the default `<fieldset>` / `<legend>` wrapper rendered around nested object fields.

```ts
interface ObjectWrapperProps {
  children: React.ReactNode
  /** The field's label string, or `undefined` when no label is set. */
  label: string | undefined
  /** Forwarded from `classNames.objectFieldset`. */
  className?: string
  /** Forwarded from `classNames.objectLegend`. */
  labelClassName?: string
}
```

Example — replace the `<fieldset>` with a card `<div>`:

```tsx
function CardObjectWrapper({ children, label, className }: ObjectWrapperProps) {
  return (
    <div className={`rounded-lg border p-4 ${className ?? ''}`}>
      {label && <p className="text-sm font-semibold mb-2">{label}</p>}
      {children}
    </div>
  )
}

<AutoForm layout={{ objectWrapper: CardObjectWrapper }} ... />
```

---

## `ArrayWrapperProps`

Props received by the `layout.arrayWrapper` component. Replaces the default `<fieldset>` / `<legend>` wrapper rendered around array fields.

```ts
interface ArrayWrapperProps {
  children: React.ReactNode
  /** The field's label string, or `undefined` when no label is set. */
  label: string | undefined
  /** Forwarded from `classNames.arrayFieldset`. */
  className?: string
  /** Forwarded from `classNames.arrayLegend`. */
  labelClassName?: string
}
```

---

## `SectionConfig`

Per-section overrides applied when rendering a named section. All keys are optional — provide only what you need.

```ts
type SectionConfig = {
  /** CSS class name forwarded to the section wrapper component. */
  className?: string
  /** Replace the section wrapper component for this section only. */
  component?: React.ComponentType<SectionWrapperProps>
}
```

`className` and `component` can be combined: the `className` is forwarded to whatever component ends up rendering the section (the per-section `component` if provided, otherwise the global `sectionWrapper`).

---

## `ArrayRowLayoutProps`

Props passed to custom `arrayRowLayout` components. Buttons are provided as pre-rendered `React.ReactNode` values — render them wherever you like.

```ts
interface ArrayRowLayoutProps {
  children: React.ReactNode
  buttons: {
    moveUp: React.ReactNode | null // null when already first row
    moveDown: React.ReactNode | null // null when already last row
    duplicate: React.ReactNode | null // null when at maxItems
    remove: React.ReactNode | null // null when remove button slot is omitted
    collapse: React.ReactNode | null // null when collapsible is disabled
  }
  index: number // zero-based row index
  rowCount: number // total number of rows
}
```

---

## `ArrayFieldLayoutProps`

Props passed to a custom `arrayFieldLayout` component. Controls the layout of the entire array field — primarily where the **Add** button appears relative to the rows.

```ts
interface ArrayFieldLayoutProps {
  rows: React.ReactNode // all rendered rows
  addButton: React.ReactNode
  rowCount: number // current number of rows
  canAdd: boolean // false when maxItems is reached
}
```

Example — add button above the rows:

```tsx
const AddFirstLayout = ({ rows, addButton }: ArrayFieldLayoutProps) => (
  <div>
    {addButton}
    {rows}
  </div>
)

<AutoForm layout={{ arrayFieldLayout: AddFirstLayout }} ... />
```

---

## `ArrayButtonProps`

Props accepted by every array action button component (add, remove, move, duplicate).

```ts
interface ArrayButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  'aria-label'?: string
  className?: string
  children?: React.ReactNode
}
```

---

## `ArrayCollapseButtonProps`

Props for the collapse/expand toggle button. Extends `ArrayButtonProps` with an `isCollapsed` flag.

```ts
interface ArrayCollapseButtonProps extends ArrayButtonProps {
  isCollapsed: boolean
}
```

:::note
If you forward these props to a DOM `<button>`, make sure to strip `isCollapsed` to avoid an unknown-prop warning.
:::

---

## `ArrayButtonSlots`

Grouped button component overrides. Pass this object to `layout.arrayButtons`.

```ts
type ArrayButtonSlots = {
  /** Fallback for any slot that isn't explicitly overridden. */
  base?: React.ComponentType<ArrayButtonProps> | null
  add?: React.ComponentType<ArrayButtonProps> | null
  remove?: React.ComponentType<ArrayButtonProps> | null
  moveUp?: React.ComponentType<ArrayButtonProps> | null
  moveDown?: React.ComponentType<ArrayButtonProps> | null
  duplicate?: React.ComponentType<ArrayButtonProps> | null
  collapse?: React.ComponentType<ArrayCollapseButtonProps> | null
}
```

Resolution order for each slot: **specific slot → `base` → built-in default**. Set a slot to `null` to omit it.

---

## `ResolvedArrayButtonSlots`

The resolved version of `ArrayButtonSlots` where every slot is either a component or `null` (when omitted). Returned from `useAutoFormContext().layout.arrayButtons`.

```ts
type ResolvedArrayButtonSlots = {
  base: React.ComponentType<ArrayButtonProps> | null
  add: React.ComponentType<ArrayButtonProps> | null
  remove: React.ComponentType<ArrayButtonProps> | null
  moveUp: React.ComponentType<ArrayButtonProps> | null
  moveDown: React.ComponentType<ArrayButtonProps> | null
  duplicate: React.ComponentType<ArrayButtonProps> | null
  collapse: React.ComponentType<ArrayCollapseButtonProps> | null
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
interface FieldProps<Value = unknown> {
  name: string
  value: Value
  onChange: (value: Value) => void
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
  schema: z.$ZodType // original unwrapped field schema
}
```

Use the generic type parameter to strongly type custom field values:

```ts
const StarRating = ({ value, onChange }: FieldProps<number>) => {
  // value is number
  return <button onClick={() => onChange(value + 1)}>+1</button>
}
```

---

## `FieldWrapperProps`

Props passed to the `fieldWrapper` component that surrounds every rendered field.

```ts
interface FieldWrapperProps {
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
  // Object field wrapper/legend:
  objectFieldset?: string // class on the <fieldset> (or objectWrapper root)
  objectLegend?: string // class on the <legend> (or objectWrapper label)
  // Array field wrapper/legend:
  arrayFieldset?: string // class on the <fieldset> (or arrayWrapper root)
  arrayLegend?: string // class on the <legend> (or arrayWrapper label)
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

Override hard-coded UI strings, including accessible aria labels.

```ts
type FormLabels = {
  // Visible button text
  submit?: string // default: "Submit"
  arrayAdd?: string // default: "Add"
  arrayRemove?: string // default: "Remove"
  arrayMoveUp?: string // default: "↑"
  arrayMoveDown?: string // default: "↓"
  arrayDuplicate?: string // default: "Duplicate"
  arrayCollapse?: string // collapse toggle (when expanded) — default: "▼"
  arrayExpand?: string // expand toggle (when collapsed) — default: "▶"

  // Dynamic aria labels and row summary (receive the 0-based row index)
  arrayItemSummary?: (index: number) => string // collapsed row fallback — default: "Item {n}"
  arrayAriaExpand?: (index: number) => string // default: "Expand item {n}"
  arrayAriaCollapse?: (index: number) => string // default: "Collapse item {n}"
  arrayAriaMoveUp?: (index: number) => string // default: "Move item {n} up"
  arrayAriaMoveDown?: (index: number) => string // default: "Move item {n} down"
  arrayAriaDuplicate?: (index: number) => string // default: "Duplicate item {n}"
  arrayAriaRemove?: (index: number) => string // default: "Remove item {n}"
}
```

UniForm ships ready-made locale packs as separate subpath exports so only the locale you import is included in your bundle:

```ts
import { en } from '@uniform-ts/core/locales/en'
import { he } from '@uniform-ts/core/locales/he'
import { es } from '@uniform-ts/core/locales/es'
```

Pass a locale directly, or spread it and override individual keys:

```tsx
import { es } from '@uniform-ts/core/locales/es'

// Full locale
<AutoForm labels={es} ... />

// Locale with one override
<AutoForm labels={{ ...es, submit: 'Guardar' }} ... />
```

See the [Localization guide](../guides/localization) for details.

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

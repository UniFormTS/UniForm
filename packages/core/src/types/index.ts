import type * as React from 'react'
import type * as z from 'zod/v4'

// ---------------------------------------------------------------------------
// DeepKeys
// ---------------------------------------------------------------------------

/**
 * Extracts the element type of an array type.
 * e.g. `ArrayItem<{ name: string }[]>` → `{ name: string }`
 */
type ArrayItem<T> = T extends (infer U)[] ? U : never

/**
 * Recursively produces all valid `fields` prop keys for a given schema shape:
 *
 * - Scalar fields  → just their key (e.g. `"name"`)
 * - Object fields  → their key + all dot-notated child paths
 *                    (e.g. `"address"` | `"address.street"`)
 * - Array fields   → their key + the unprefixed keys of the item object, so
 *                    you can target every row's sub-field uniformly
 *                    (e.g. `"items"` | `"items.name"` | `"items.qty"`)
 *                    Index-based paths like `"items.0.name"` are intentionally
 *                    excluded — row count is dynamic at runtime.
 *
 * @example
 * // Given { name: string; address: { street: string }; items: { qty: number }[] }
 * // DeepKeys produces:
 * //   "name" | "address" | "address.street" | "items" | "items.qty"
 */
type DeepKeys<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends unknown[]
        ? ArrayItem<T[K]> extends object
          ? K | `${K}.${DeepKeys<ArrayItem<T[K]>>}`
          : K
        : T[K] extends object
          ? K | `${K}.${DeepKeys<T[K]>}`
          : K
    }[keyof T & string]
  : never

// ---------------------------------------------------------------------------
// FieldType
// ---------------------------------------------------------------------------

/**
 * The resolved primitive or structural type of a schema field, as determined
 * by introspecting the Zod schema. Used internally to decide which field
 * component to render.
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select' // ZodEnum / ZodNativeEnum
  | 'object' // ZodObject (nested)
  | 'array' // ZodArray
  | 'union' // ZodUnion
  | 'unknown' // fallback for unsupported types

// ---------------------------------------------------------------------------
// SelectOption
// ---------------------------------------------------------------------------

/**
 * A single option entry used in `select` / enum fields.
 */
export type SelectOption = {
  /** Human-readable text displayed in the dropdown. */
  label: string
  /** The underlying value submitted with the form. */
  value: string | number
}

// ---------------------------------------------------------------------------
// FieldCondition
// ---------------------------------------------------------------------------

/**
 * A predicate function that receives the current form values and returns
 * `true` when the field should be visible, `false` when it should be hidden.
 *
 * @template TValues - The shape of the form values object.
 */
export type FieldCondition<TValues = Record<string, unknown>> = (
  values: TValues,
) => boolean

// ---------------------------------------------------------------------------
// FieldDependencyResult
// ---------------------------------------------------------------------------

/**
 * The object returned by a field's `depend` function. Each key is optional —
 * only the properties you return will be applied; omitted keys leave the
 * current field state unchanged.
 */
export type FieldDependencyResult = {
  /** Override the available options for select fields */
  options?: SelectOption[]
  /** Dynamically show or hide the field */
  hidden?: boolean
  /** Dynamically enable or disable the field */
  disabled?: boolean
  /** Override the field label */
  label?: string
  /** Override the placeholder text */
  placeholder?: string
  /** Override the description text */
  description?: string
  /** Set the field's value programmatically. Only return this when the value
   *  should be derived (e.g. auto-reset a cascade field). Omit (or return
   *  `undefined`) to leave the current value untouched. */
  value?: unknown
}

// ---------------------------------------------------------------------------
// FieldMeta
// ---------------------------------------------------------------------------

/**
 * The base set of per-field UI metadata that can be provided via the `fields`
 * prop or through Zod schema extensions (`.meta()`).
 *
 * `FieldMeta` extends this type with an index signature to allow arbitrary
 * extra keys for custom component use-cases.
 */
export type FieldMetaBase = {
  /** Human-readable label rendered above the field. Falls back to a derived label from the field name. */
  label?: string
  /** Placeholder text rendered inside the input when it has no value. */
  placeholder?: string
  /** Helper text rendered below the field to provide additional context. */
  description?: string
  /** Static list of options for `select` / enum fields. */
  options?: SelectOption[]
  /** Group the field under a named section in the form layout. */
  section?: string
  /** Explicit render order within the form or section (lower numbers render first). */
  order?: number
  /** Grid column span for multi-column layouts (e.g. `1`–`12`). */
  span?: number
  /** When `true`, the field is not rendered. */
  hidden?: boolean
  /** When `true`, the field is rendered but not interactive. */
  disabled?: boolean
  /** Conditionally show or hide the field based on the current form values. */
  condition?: FieldCondition
  /** Derive options, visibility, disabled state, or metadata from other field values */
  depend?: (values: Record<string, unknown>) => FieldDependencyResult
  /**
   * Override the component used to render this field.
   *
   * - **string** — a key registered in the `ComponentRegistry` (e.g. `'autocomplete'`
   *   registered via `createAutoForm({ components: { autocomplete: MyComp } })` or the
   *   `components` prop).
   * - **React component** — a `FieldProps`-compatible component passed inline,
   *   bypassing the registry entirely (e.g. `component: MyCustomInput`).
   *
   * Note: typed as `React.ComponentType<any>` here to avoid a circular type
   * reference through `FieldProps → FieldMeta → component → FieldProps`.
   * The `ComponentRegistry` keeps the stricter `React.ComponentType<FieldProps>`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: string | React.ComponentType<any>
}

/**
 * Per-field UI metadata with an open index signature, allowing arbitrary
 * extra keys for custom component use-cases. Extends `FieldMetaBase` with
 * all the standard metadata properties.
 */
export type FieldMeta = FieldMetaBase & { [key: string]: unknown }

// ---------------------------------------------------------------------------
// FieldConfig
// ---------------------------------------------------------------------------

/**
 * Common properties shared by every field variant.
 */
type FieldConfigBase = {
  /** Dot-notated field path (e.g. `"address.street"`). */
  name: string
  /** Display label for the field. */
  label: string
  /** Whether the field is required by the schema. */
  required: boolean
  /** Merged UI metadata for the field. */
  meta: FieldMeta
}

/**
 * The fully resolved configuration for a single form field, produced by
 * introspecting the Zod schema and merging any `fields` prop overrides.
 * Consumed internally by field renderer components.
 *
 * This is a discriminated union on the `type` field — narrow on `type` to
 * access the fields that are only present for specific field kinds (e.g.
 * `children` for `"object"`, `itemConfig` for `"array"`, etc.).
 */
export type FieldConfig = FieldConfigBase &
  (
    | { type: 'string' }
    | { type: 'number' }
    | { type: 'boolean' }
    | { type: 'date' }
    | {
        type: 'select'
        /** Resolved options for `select` / enum fields. */
        options: SelectOption[]
      }
    | {
        type: 'object'
        /** Child field configs for nested object fields. */
        children: FieldConfig[]
      }
    | {
        type: 'array'
        /** Item field config describing a single row's shape. */
        itemConfig: FieldConfig
        /** Minimum number of items (from `z.array().min(...)`). */
        minItems?: number
        /** Maximum number of items (from `z.array().max(...)`). */
        maxItems?: number
      }
    | {
        type: 'union'
        /** Variant configs for each union member. */
        unionVariants: FieldConfig[]
        /** Discriminator key for discriminated unions. */
        discriminatorKey?: string
      }
    | { type: 'unknown' }
  )

// ---------------------------------------------------------------------------
// FieldProps
// ---------------------------------------------------------------------------

/**
 * The props passed to every field renderer component. Provides the current
 * value, change/blur handlers, and all resolved UI metadata needed to render
 * a single field.
 */
export type FieldProps = {
  /** Dot-notated field path (e.g. `"address.street"`). */
  name: string
  /** The current field value. */
  value: unknown
  /** Callback to update the field value. */
  onChange: (value: unknown) => void
  /** Callback fired when the field loses focus. */
  onBlur: () => void
  /** Resolved display label for the field. */
  label: string
  /** Placeholder text for the input. */
  placeholder?: string
  /** Helper text rendered below the field. */
  description?: string
  /** Validation error message for the field. */
  error?: string
  /** Whether the field is required by the schema. */
  required: boolean
  /** When `true`, the field is rendered but not interactive. */
  disabled?: boolean
  /** Resolved options for `select` / enum fields. */
  options?: SelectOption[]
  /** Full field metadata, including any custom keys. */
  meta: FieldMeta
}

// ---------------------------------------------------------------------------
// ComponentRegistry
// ---------------------------------------------------------------------------

/**
 * A map of field type keys to React components used to render them.
 * Built-in keys (`string`, `number`, `boolean`, `date`, `select`, `textarea`)
 * are pre-typed. Additional custom keys can be added via the index signature
 * and registered through `createAutoForm` or the `components` prop.
 */
export type ComponentRegistry = {
  string?: React.ComponentType<FieldProps>
  number?: React.ComponentType<FieldProps>
  boolean?: React.ComponentType<FieldProps>
  date?: React.ComponentType<FieldProps>
  select?: React.ComponentType<FieldProps>
  textarea?: React.ComponentType<FieldProps>
  [key: string]: React.ComponentType<FieldProps> | undefined
}

// ---------------------------------------------------------------------------
// FieldWrapperProps
// ---------------------------------------------------------------------------

/**
 * Props passed to the field wrapper component that surrounds every rendered
 * field. Used to render the label, description, error message, and grid span.
 */
export type FieldWrapperProps = {
  /** The field input component to wrap. */
  children: React.ReactNode
  /** The fully resolved field configuration. */
  field: FieldConfig
  /** Validation error message for the field. */
  error?: string
  /** Grid column span override (takes precedence over `field.meta.span`). */
  span?: number
  /**
   * Zero-based render index of this field within its parent container
   * (form root or section). Exposed as the `--field-index` CSS custom property.
   */
  index?: number
  /**
   * Nesting depth of this field (0 = top-level, 1 = inside object, etc.).
   * Exposed as the `--field-depth` CSS custom property.
   */
  depth?: number
}

// ---------------------------------------------------------------------------
// LayoutSlots
// ---------------------------------------------------------------------------

/**
 * Props passed to the component that renders a single row inside an array field,
 * including the row's content and action buttons (move, duplicate, remove, collapse).
 */
export type ArrayRowLayoutProps = {
  /** The rendered fields for this array item. */
  children: React.ReactNode
  /** Action button nodes for the row. */
  buttons: {
    /** Button to move the row up, or `null` if already first. */
    moveUp: React.ReactNode | null
    /** Button to move the row down, or `null` if already last. */
    moveDown: React.ReactNode | null
    /** Button to duplicate the row, or `null` if at max items. */
    duplicate: React.ReactNode | null
    /** Button to remove the row. */
    remove: React.ReactNode
    /** Button to collapse/expand the row, or `null` if collapsing is disabled. */
    collapse: React.ReactNode | null
  }
  /** Zero-based index of this row within the array. */
  index: number
  /** Total number of rows currently in the array. */
  rowCount: number
}

/**
 * Optional layout slot overrides for top-level structural components of the
 * form. Provide only the slots you want to replace; omitted slots fall back
 * to the built-in defaults.
 */
export type LayoutSlots = {
  /** Wrapper rendered around the entire form. */
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  /** Wrapper rendered around each named field section. */
  sectionWrapper?: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  /** Custom submit button component. */
  submitButton?: React.ComponentType<{ isSubmitting: boolean }>
  /** Custom layout component for individual rows in array fields. */
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
}

/**
 * The resolved version of `LayoutSlots` used internally, where all slots are
 * guaranteed to be defined (falling back to built-in defaults).
 */
export type ResolvedLayoutSlots = {
  formWrapper: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  submitButton: React.ComponentType<{ isSubmitting: boolean }>
  arrayRowLayout: React.ComponentType<ArrayRowLayoutProps>
}

// ---------------------------------------------------------------------------
// FormClassNames
// ---------------------------------------------------------------------------

/**
 * CSS class name overrides for the various structural elements of the form.
 * Only the keys you provide will be applied; omitted keys use the built-in
 * default class names (or none, if the default components don't apply any).
 */
export type FormClassNames = {
  /** Class applied to the `<form>` element. */
  form?: string
  /** Class applied to each field wrapper. */
  fieldWrapper?: string
  /** Class applied to each field label. */
  label?: string
  /** Class applied to each field description. */
  description?: string
  /** Class applied to each field error message. */
  error?: string
  /** Class applied to the "add item" button in array fields. */
  arrayAdd?: string
  /** Class applied to the "remove item" button in array fields. */
  arrayRemove?: string
  /** Class applied to the "move item" buttons in array fields. */
  arrayMove?: string
  /** Class applied to the "duplicate item" button in array fields. */
  arrayDuplicate?: string
  /** Class applied to the "collapse item" button in array fields. */
  arrayCollapse?: string
}

// ---------------------------------------------------------------------------
// FieldOverride
// ---------------------------------------------------------------------------

/**
 * A per-field override entry used in the AutoFormProps `fields` prop.
 * Unlike the base FieldMeta, the `depend` callback here is typed to the
 * specific schema's inferred value type, providing full IDE autocomplete.
 */
export type FieldOverride<TValues = Record<string, unknown>> = Omit<
  Partial<FieldMetaBase>,
  'depend'
> & {
  depend?: (values: TValues) => FieldDependencyResult
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// FormLabels
// ---------------------------------------------------------------------------

export type FormLabels = {
  /** Submit button text — default: "Submit" */
  submit?: string
  /** Array "Add item" button — default: "Add" */
  arrayAdd?: string
  /** Array "Remove row" button — default: "Remove" */
  arrayRemove?: string
  /** Array "Move row up" button — default: "↑" */
  arrayMoveUp?: string
  /** Array "Move row down" button — default: "↓" */
  arrayMoveDown?: string
  /** Array "Duplicate row" button — default: "Duplicate" */
  arrayDuplicate?: string
  /** Array row toggle shown when the row is expanded (clicking collapses it) — default: "▼" */
  arrayCollapse?: string
  /** Array row toggle shown when the row is collapsed (clicking expands it) — default: "▶" */
  arrayExpand?: string
}

// ---------------------------------------------------------------------------
// CoercionMap
// ---------------------------------------------------------------------------

/**
 * A map of field names to coercion functions. Each function receives the raw
 * field value and returns the coerced value before Zod validation is applied.
 * Useful for transforming string inputs (e.g. from native `<input>`) into the
 * types expected by the schema (e.g. numbers, dates).
 */
export type CoercionMap = Record<string, (value: unknown) => unknown>

// ---------------------------------------------------------------------------
// ValidationMessages
// ---------------------------------------------------------------------------

/**
 * Custom validation error message overrides. Use `required` to override the
 * global "required field" message, or provide a field name key to override
 * messages for a specific field (supports nested dot-notated paths).
 */
export type ValidationMessages = {
  required?: string
  [fieldName: string]: string | Record<string, string> | undefined
}

// ---------------------------------------------------------------------------
// PersistStorage
// ---------------------------------------------------------------------------

/**
 * A minimal storage adapter interface compatible with `localStorage` and
 * `sessionStorage`. Provide a custom implementation to persist form values
 * to any backing store (e.g. IndexedDB, AsyncStorage).
 */
export type PersistStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

// ---------------------------------------------------------------------------
// AutoFormHandle
// ---------------------------------------------------------------------------

/**
 * The imperative handle exposed via `ref` on `<AutoForm>`. Provides methods
 * to programmatically control the form from a parent component.
 *
 * @template TValues - The inferred shape of the form's Zod schema.
 */
export type AutoFormHandle<TValues = Record<string, unknown>> = {
  /** Reset the form to defaultValues (or provided values) */
  reset: (values?: Partial<TValues>) => void
  /** Programmatically trigger form submission */
  submit: () => void
  /** Set one or more field values */
  setValues: (values: Partial<TValues>) => void
  /** Get the current form values */
  getValues: () => TValues
  /** Set errors on specific fields */
  setErrors: (errors: Record<string, string>) => void
  /** Clear all errors, or errors on specific fields */
  clearErrors: (fieldNames?: string[]) => void
  /** Focus a specific field by name (dot-notated for nested fields) */
  focus: (fieldName: string) => void
}

// ---------------------------------------------------------------------------
// AutoFormConfig (factory)
// ---------------------------------------------------------------------------

/**
 * Static configuration provided to `createAutoForm`. These options become the
 * default for every form instance created by the factory, and can be
 * overridden per-instance via the corresponding `<AutoForm>` props.
 */
export type AutoFormConfig = {
  /** Default component registry for all form instances. */
  components?: ComponentRegistry
  /** Default field wrapper component for all form instances. */
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  /** Default layout slot overrides for all form instances. */
  layout?: LayoutSlots
  /** Default CSS class name overrides for all form instances. */
  classNames?: FormClassNames
  /** When `true`, all fields in every form instance are disabled by default. */
  disabled?: boolean
  /** Default coercion map applied to all form instances. */
  coercions?: CoercionMap
  /** Default validation message overrides for all form instances. */
  messages?: ValidationMessages
  /** Default label strings; overridden per-instance by the `labels` prop */
  labels?: FormLabels
}

// ---------------------------------------------------------------------------
// AutoFormProps
// ---------------------------------------------------------------------------

/**
 * Props for the `<AutoForm>` component. Drives schema introspection, field
 * rendering, validation, and submission.
 *
 * @template TSchema - The Zod object schema that defines the form shape.
 */
export type AutoFormProps<TSchema extends z.ZodObject<z.ZodRawShape>> = {
  /** The Zod schema used to introspect fields and validate values. */
  schema: TSchema
  /** Called with the validated form values when the form is submitted successfully. */
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  /** Initial values to pre-populate the form with. */
  defaultValues?: Partial<z.infer<TSchema>>
  /** Component registry overrides for this form instance. */
  components?: ComponentRegistry
  /** Per-field UI metadata overrides (label, placeholder, options, etc.). */
  fields?: Partial<
    Record<DeepKeys<z.infer<TSchema>>, FieldOverride<z.infer<TSchema>>>
  >
  /** Field wrapper component override for this form instance. */
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  /** Layout slot overrides for this form instance. */
  layout?: LayoutSlots
  /** CSS class name overrides for this form instance. */
  classNames?: FormClassNames
  /** When `true`, all fields are rendered in a disabled (non-interactive) state. */
  disabled?: boolean
  /** Coercion map applied before Zod validation for this form instance. */
  coercions?: CoercionMap
  /** Validation message overrides for this form instance. */
  messages?: ValidationMessages
  /** When set, form values are auto-saved to storage under this key */
  persistKey?: string
  /** Debounce interval in ms for persistence writes (default: 300) */
  persistDebounce?: number
  /** Custom storage adapter (default: localStorage) */
  persistStorage?: PersistStorage
  /** Called on every value change with the current form values */
  onValuesChange?: (values: z.infer<TSchema>) => void
  /** Customize hard-coded UI text (submit button, array buttons, etc.) */
  labels?: FormLabels
}

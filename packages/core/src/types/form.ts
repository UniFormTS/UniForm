import type { FieldPath, FieldPathValue, FieldValues } from 'react-hook-form'
import type * as z from 'zod/v4/core'
import type { DeepKeys, DeepFieldValue } from './utils'
import type { FieldOverride } from './field'
import type { ComponentRegistry, FieldWrapperProps } from './registry'
import type { LayoutSlots, FormClassNames } from './layout'

// ---------------------------------------------------------------------------
// FormMethods
// ---------------------------------------------------------------------------

/**
 * All programmatic form control methods, shared by both the field `onChange`
 * callback and the imperative ref handle.
 *
 * @template TValues - The inferred shape of the form values.
 */
export type FormMethods<TValues extends FieldValues = FieldValues> = {
  /** Set a single field value programmatically */
  setValue: <K extends FieldPath<TValues>>(
    name: K,
    value: FieldPathValue<TValues, K>,
  ) => void
  /** Set multiple field values at once */
  setValues: (values: Partial<TValues>) => void
  /** Get the current form values */
  getValues: () => TValues
  /** Reset a single field to its default value */
  resetField: (name: FieldPath<TValues>) => void
  /** Reset the entire form, optionally to new values */
  reset: (values?: Partial<TValues>) => void
  /** Set a validation error on a specific field */
  setError: (name: FieldPath<TValues>, message: string) => void
  /** Set validation errors on multiple fields at once */
  setErrors: (errors: Partial<Record<FieldPath<TValues>, string>>) => void
  /** Clear validation errors (all fields, or specific ones) */
  clearErrors: (names?: FieldPath<TValues> | FieldPath<TValues>[]) => void
  /** Programmatically trigger form submission */
  submit: () => void
  /** Focus a specific field by name (dot-notated for nested fields) */
  focus: (fieldName: FieldPath<TValues>) => void
  /** Watch field values reactively */
  watch: {
    (): TValues
    <K extends FieldPath<TValues>>(name: K): FieldPathValue<TValues, K>
  }
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
  /** Collapsed row summary fallback — default: (i) => `Item ${i + 1}` */
  arrayItemSummary?: (index: number) => string
  /** Aria label for the expand toggle — default: (i) => `Expand item ${i + 1}` */
  arrayAriaExpand?: (index: number) => string
  /** Aria label for the collapse toggle — default: (i) => `Collapse item ${i + 1}` */
  arrayAriaCollapse?: (index: number) => string
  /** Aria label for the move-up button — default: (i) => `Move item ${i + 1} up` */
  arrayAriaMoveUp?: (index: number) => string
  /** Aria label for the move-down button — default: (i) => `Move item ${i + 1} down` */
  arrayAriaMoveDown?: (index: number) => string
  /** Aria label for the duplicate button — default: (i) => `Duplicate item ${i + 1}` */
  arrayAriaDuplicate?: (index: number) => string
  /** Aria label for the remove button — default: (i) => `Remove item ${i + 1}` */
  arrayAriaRemove?: (index: number) => string
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
 * @template TSchema - The Zod object schema that defines the form shape.
 */
export type AutoFormHandle<TSchema extends z.$ZodObject = z.$ZodObject> =
  FormMethods<z.infer<TSchema>>

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
 * @template TSchema - A `ZodObject` schema that defines the form shape.
 */
export type AutoFormProps<TSchema extends z.$ZodObject> = {
  /** A UniForm instance carrying the schema and typed onChange handlers. */
  form: { readonly schema: TSchema }
  /** Called with the validated form values when the form is submitted successfully. */
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  /**
   * Initial values to pre-populate the form with.
   * When an async function is provided, the form shows `loadingFallback` until the
   * promise resolves, then resets the form with the loaded values.
   */
  defaultValues?:
    | Partial<z.infer<TSchema>>
    | (() => Promise<Partial<z.infer<TSchema>>>)
  /** Component registry overrides for this form instance. */
  components?: ComponentRegistry
  /** Per-field UI metadata overrides (label, placeholder, options, etc.). */
  fields?: {
    [K in DeepKeys<z.infer<TSchema>>]?: FieldOverride<
      TSchema,
      DeepFieldValue<z.infer<TSchema>, K>
    >
  }
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

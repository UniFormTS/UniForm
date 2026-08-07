import type { FieldPath, FieldPathValue, FieldValues } from 'react-hook-form'
import type * as z from 'zod/v4/core'
import type { DeepKeys, DeepFieldValue } from './utils'
import type { FieldOverride, SetValueOptions } from './field'
import type { GetOptionKey, IsOptionEqual } from './shared'
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
  /**
   * Set a single field value programmatically.
   *
   * Defaults to `{ shouldValidate: true, shouldDirty: true }`. Pass
   * `{ shouldValidate: false }` to write without re-running the whole schema —
   * useful for high-frequency writes.
   */
  setValue: <K extends FieldPath<TValues>>(
    name: K,
    value: FieldPathValue<TValues, K>,
    options?: SetValueOptions,
  ) => void
  /**
   * Set multiple field values in **one** logical update.
   *
   * Writes every key without validating, then revalidates once — so a 20-key
   * update runs the schema once, not twenty times. Pass
   * `{ shouldValidate: false }` to skip validation entirely.
   */
  setValues: (values: Partial<TValues>, options?: SetValueOptions) => void
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
  /**
   * Push an arbitrary list of issues into the error tree — including paths that
   * are not rendered fields, array-element paths like `"lines.0"`, and the form
   * root (`''` or `'root'`).
   *
   * Shaped for backend `/validate` responses, which rarely arrive as a flat map
   * keyed by field name.
   *
   * @example
   * formMethods.setIssues([
   *   { path: 'lines.0', message: 'Duplicate SKU in this order' },
   *   { path: '', message: 'Order total exceeds the customer credit limit' },
   * ])
   */
  setIssues: (issues: { path: string; message: string }[]) => void
  /** Clear validation errors (all fields, or specific ones) */
  clearErrors: (names?: FieldPath<TValues> | FieldPath<TValues>[]) => void
  /** Programmatically trigger form submission */
  submit: () => void
  /** Remove the persisted draft for this form's `persistKey`. */
  clearPersistedData: () => void
  /** Whether a persisted draft was found and restored on mount. */
  hasPersistedDraft: () => boolean
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
 * A map of **field types** (`'string'`, `'number'`, `'boolean'`, `'date'`) to
 * coercion functions. Each function receives the raw field value and returns
 * the coerced value before Zod validation is applied — this is what turns the
 * string a native `<input>` produces into the number or `Date` the schema
 * expects.
 *
 * Keys are field **types**, not field names; an entry overrides the built-in
 * coercion for every field of that type.
 *
 * @example
 * coercions={{ number: (v) => (v === '' ? undefined : Number(v)) }}
 */
export type CoercionMap = Record<string, (value: unknown) => unknown>

// ---------------------------------------------------------------------------
// ValidationMessages
// ---------------------------------------------------------------------------

/**
 * Targeted overrides for validation error messages.
 *
 * This is **not** a second message system: Zod remains the source of every
 * message (from the schema, or from a global `z.config({ localeError })`), and
 * anything not listed here falls through untouched. Use `required` to override
 * the global required message, or a field name key — a string to replace every
 * error on that field, or an object mapping Zod error codes to strings.
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
 * to any backing store.
 *
 * Every method may return a promise, so IndexedDB / AsyncStorage adapters are
 * first-class — restoration is gated behind the form's loading state.
 */
export type PersistStorage = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
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
  /**
   * Default option-key derivation for every select in every form. Per-field
   * `meta.getOptionKey` wins.
   */
  getOptionKey?: GetOptionKey
  /**
   * Default option equality for every select in every form. Per-field
   * `meta.isOptionEqual` wins.
   */
  isOptionEqual?: IsOptionEqual
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
  /** Custom storage adapter (default: `sessionStorage`) */
  persistStorage?: PersistStorage
  /**
   * Schema version stamped onto the persisted draft (default: `0`).
   * Bump it whenever the shape of the form's values changes.
   */
  persistVersion?: number
  /**
   * Upgrade a draft saved at an older `persistVersion`. Return the migrated
   * values, or `undefined` to discard the draft and start from defaults.
   *
   * Without this, a version mismatch discards the draft with a warning rather
   * than half-restoring it.
   */
  persistMigrate?: (
    persisted: unknown,
    fromVersion: number,
  ) => Partial<z.infer<TSchema>> | undefined
  /** Called on every value change with the current form values */
  onValuesChange?: (values: z.infer<TSchema>) => void
  /** Customize hard-coded UI text (submit button, array buttons, etc.) */
  labels?: FormLabels
  /**
   * Default option-key derivation for every select in this form. Per-field
   * `meta.getOptionKey` wins.
   */
  getOptionKey?: GetOptionKey
  /**
   * Default option equality for every select in this form. Per-field
   * `meta.isOptionEqual` wins.
   */
  isOptionEqual?: IsOptionEqual
}

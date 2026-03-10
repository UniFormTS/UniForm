import type * as React from 'react'
import type * as z from 'zod/v4'

// ---------------------------------------------------------------------------
// FieldType
// ---------------------------------------------------------------------------

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

export type SelectOption = {
  label: string
  value: string | number
}

// ---------------------------------------------------------------------------
// FieldCondition
// ---------------------------------------------------------------------------

export type FieldCondition<TValues = Record<string, unknown>> = (
  values: TValues,
) => boolean

// ---------------------------------------------------------------------------
// FieldDependencyResult
// ---------------------------------------------------------------------------

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

export type FieldMetaBase = {
  label?: string
  placeholder?: string
  description?: string
  options?: SelectOption[]
  section?: string
  order?: number
  span?: number
  hidden?: boolean
  disabled?: boolean
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

export type FieldMeta = FieldMetaBase & { [key: string]: unknown }

// ---------------------------------------------------------------------------
// FieldConfig
// ---------------------------------------------------------------------------

export type FieldConfig = {
  name: string
  type: FieldType
  label: string
  required: boolean
  meta: FieldMeta
  options?: SelectOption[]
  children?: FieldConfig[]
  itemConfig?: FieldConfig
  unionVariants?: FieldConfig[]
  discriminatorKey?: string
  minItems?: number
  maxItems?: number
}

// ---------------------------------------------------------------------------
// FieldProps
// ---------------------------------------------------------------------------

export type FieldProps = {
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
  options?: SelectOption[]
  meta: FieldMeta
}

// ---------------------------------------------------------------------------
// ComponentRegistry
// ---------------------------------------------------------------------------

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

export type FieldWrapperProps = {
  children: React.ReactNode
  field: FieldConfig
  error?: string
  span?: number
}

// ---------------------------------------------------------------------------
// LayoutSlots
// ---------------------------------------------------------------------------

export type ArrayRowLayoutProps = {
  children: React.ReactNode
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

export type LayoutSlots = {
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper?: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  submitButton?: React.ComponentType<{ isSubmitting: boolean }>
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
}

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

export type FormClassNames = {
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

// ---------------------------------------------------------------------------
// CoercionMap
// ---------------------------------------------------------------------------

export type CoercionMap = Record<string, (value: unknown) => unknown>

// ---------------------------------------------------------------------------
// ValidationMessages
// ---------------------------------------------------------------------------

export type ValidationMessages = {
  required?: string
  [fieldName: string]: string | Record<string, string> | undefined
}

// ---------------------------------------------------------------------------
// PersistStorage
// ---------------------------------------------------------------------------

export type PersistStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

// ---------------------------------------------------------------------------
// AutoFormHandle
// ---------------------------------------------------------------------------

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

export type AutoFormConfig = {
  components?: ComponentRegistry
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
}

// ---------------------------------------------------------------------------
// AutoFormProps
// ---------------------------------------------------------------------------

export type AutoFormProps<TSchema extends z.ZodObject<z.ZodRawShape>> = {
  schema: TSchema
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  defaultValues?: Partial<z.infer<TSchema>>
  components?: ComponentRegistry
  fields?: Record<string, Partial<FieldMeta>>
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
  /** When set, form values are auto-saved to storage under this key */
  persistKey?: string
  /** Debounce interval in ms for persistence writes (default: 300) */
  persistDebounce?: number
  /** Custom storage adapter (default: localStorage) */
  persistStorage?: PersistStorage
  /** Called on every value change with the current form values */
  onValuesChange?: (values: z.infer<TSchema>) => void
}

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
// FieldMeta
// ---------------------------------------------------------------------------

export type FieldMetaBase = {
  label?: string
  placeholder?: string
  description?: string
  section?: string
  order?: number
  span?: number
  hidden?: boolean
  disabled?: boolean
  condition?: FieldCondition
  component?: string
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

export type LayoutSlots = {
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper?: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  submitButton?: React.ComponentType<{ isSubmitting: boolean }>
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
}

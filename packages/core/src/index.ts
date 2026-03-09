// Zod GlobalMeta augmentation — gives .meta() autocomplete for FieldMeta properties
export * from './zod-augmentation.d'

// Types
export type {
  FieldType,
  SelectOption,
  FieldCondition,
  FieldMetaBase,
  FieldMeta,
  FieldConfig,
  FieldProps,
  ComponentRegistry,
  FieldWrapperProps,
  LayoutSlots,
  FormClassNames,
  AutoFormProps,
  AutoFormConfig,
  CoercionMap,
  ValidationMessages,
} from './types'

// Introspection
export {
  introspectSchema,
  introspectObjectSchema,
} from './introspection/introspect'

// Components
export { AutoForm } from './components/AutoForm'
export { FieldRenderer } from './components/FieldRenderer'

// Default components
export { DefaultInput } from './components/defaults/DefaultInput'
export { DefaultCheckbox } from './components/defaults/DefaultCheckbox'
export { DefaultSelect } from './components/defaults/DefaultSelect'
export { DefaultFieldWrapper } from './components/defaults/DefaultFieldWrapper'
export { DefaultSubmitButton } from './components/defaults/DefaultSubmitButton'

// Registry
export { defaultRegistry } from './registry/defaultRegistry'
export { mergeRegistries } from './registry/mergeRegistries'

// Factory
export { createAutoForm } from './factory/createAutoForm'

// Coercion
export { coerceValue, defaultCoercionMap } from './coercion/coerce'

// Hooks
export { useConditionalFields } from './hooks/useConditionalFields'
export { useSectionGrouping } from './hooks/useSectionGrouping'
export type { SectionGroup } from './hooks/useSectionGrouping'

// Context
export { useAutoFormContext } from './context/AutoFormContext'
export type { AutoFormContextValue } from './context/AutoFormContext'

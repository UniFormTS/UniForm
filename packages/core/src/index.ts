// Zod GlobalMeta augmentation — gives .meta() autocomplete for FieldMeta properties
export type * from './zod-augmentation'

// Types
export type {
  FieldType,
  SelectOption,
  FieldDependencyResult,
  FieldCondition,
  FieldMetaBase,
  FieldMeta,
  FieldOverride,
  FieldConfig,
  FieldProps,
  ComponentRegistry,
  FieldWrapperProps,
  ArrayButtonProps,
  ArrayCollapseButtonProps,
  ArrayButtonSlots,
  ArrayRowLayoutProps,
  ArrayFieldLayoutProps,
  LayoutSlots,
  ResolvedArrayButtonSlots,
  ResolvedLayoutSlots,
  FormClassNames,
  FormLabels,
  AutoFormProps,
  AutoFormConfig,
  AutoFormHandle,
  FormMethods,
  CoercionMap,
  ValidationMessages,
  PersistStorage,
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
export { DefaultArrayButton } from './components/defaults/DefaultArrayButton'
export { DefaultArrayCollapseButton } from './components/defaults/DefaultArrayCollapseButton'
export { DefaultArrayFieldLayout } from './components/defaults/DefaultArrayFieldLayout'
export { DefaultArrayRowLayout } from './components/defaults/DefaultArrayRowLayout'

// Registry
export { defaultRegistry } from './registry/defaultRegistry'
export { mergeRegistries } from './registry/mergeRegistries'

// Factory
export { createAutoForm } from './factory/createAutoForm'

// Coercion
export { coerceValue, defaultCoercionMap } from './coercion/coerce'

// UniForm
export { UniForm, createForm } from './UniForm'
export type { UniFormContext } from './UniForm'

// Hooks
export { useConditionalFields } from './hooks/useConditionalFields'
export { useSectionGrouping } from './hooks/useSectionGrouping'
export type { SectionGroup } from './hooks/useSectionGrouping'
export { useFormPersistence } from './hooks/useFormPersistence'

// Context
export { useAutoFormContext } from './context/AutoFormContext'
export type { AutoFormContextValue } from './context/AutoFormContext'

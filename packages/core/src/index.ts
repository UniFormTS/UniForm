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
  ObjectWrapperProps,
  ArrayWrapperProps,
  FormWrapperProps,
  SectionWrapperProps,
  SubmitButtonProps,
  SectionConfig,
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
  SetValueOptions,
  ContainerFieldProps,
  ObjectContainerProps,
  ArrayContainerProps,
} from './types'

// Introspection
export {
  introspectSchema,
  introspectObjectSchema,
} from './introspection/introspect'

// Components
export { AutoForm } from './components/AutoForm'
export { FieldRenderer } from './components/FieldRenderer'
export { Field } from './components/Field'
export type { FieldComponentProps } from './components/Field'
export { UniFormProvider } from './components/UniFormProvider'
export type { UniFormProviderProps } from './components/UniFormProvider'

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
export { DefaultObjectWrapper } from './components/defaults/DefaultObjectWrapper'
export { DefaultArrayWrapper } from './components/defaults/DefaultArrayWrapper'

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
export { useArrayField } from './hooks/useArrayField'
export type { ArrayFieldActions } from './hooks/arrayFieldRegistry'
export { useUniForm, isUniFormInstance } from './hooks/useUniForm'
export type { UniFormInstance, UseUniFormOptions } from './hooks/useUniForm'
export { useFormValue, useFormValues } from './hooks/useFormValue'
export { useField } from './hooks/useField'
export type { UseFieldOptions, UseFieldResult } from './hooks/useField'

// Context
export { useAutoFormContext } from './context/AutoFormContext'
export type { AutoFormContextValue } from './context/AutoFormContext'
export { useFieldPath } from './context/FieldPathContext'

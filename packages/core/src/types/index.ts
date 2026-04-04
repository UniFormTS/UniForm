// ---------------------------------------------------------------------------
// Public type surface — re-exports from focused sub-modules.
// All external consumers should import from '@uniform-ts/core' or
// 'packages/core/src/types' (this barrel); never from the sub-modules directly.
// ---------------------------------------------------------------------------

export type { DeepKeys, DeepFieldValue } from './utils'

export type { SelectOption } from './shared'

export type {
  FieldType,
  FieldCondition,
  FieldDependencyResult,
  FieldMetaBase,
  FieldMeta,
  FieldConfig,
  FieldProps,
  FieldOverride,
} from './field'

export type { ComponentRegistry, FieldWrapperProps } from './registry'

export type {
  ArrayButtonProps,
  ArrayCollapseButtonProps,
  ArrayFieldLayoutProps,
  ArrayRowLayoutProps,
  FormWrapperProps,
  SectionWrapperProps,
  ObjectWrapperProps,
  ArrayWrapperProps,
  SubmitButtonProps,
  SectionConfig,
  ArrayButtonSlots,
  ResolvedArrayButtonSlots,
  LayoutSlots,
  ResolvedLayoutSlots,
  FormClassNames,
} from './layout'

export type {
  FormMethods,
  FormLabels,
  CoercionMap,
  ValidationMessages,
  PersistStorage,
  AutoFormHandle,
  AutoFormConfig,
  AutoFormProps,
} from './form'

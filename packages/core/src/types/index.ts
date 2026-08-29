// ---------------------------------------------------------------------------
// Public type surface — re-exports from focused sub-modules.
// All external consumers should import from '@uniform-ts/core' or
// 'packages/core/src/types' (this barrel); never from the sub-modules directly.
// ---------------------------------------------------------------------------

export type {
  DeepKeys,
  DeepKeysIndexed,
  DeepFieldValue,
  ConditionValues,
} from './utils'

export type { SelectOption, GetOptionKey, IsOptionEqual } from './shared'

export type {
  FieldType,
  FieldCondition,
  FieldRequirement,
  FieldDependencyResult,
  FieldMetaBase,
  FieldMeta,
  FieldConfig,
  FieldProps,
  FieldOverride,
  SetValueOptions,
  ContainerFieldProps,
  ObjectContainerProps,
  ArrayContainerProps,
} from './field'

export type {
  ComponentRegistry,
  RegisterableComponent,
  FieldWrapperProps,
} from './registry'

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

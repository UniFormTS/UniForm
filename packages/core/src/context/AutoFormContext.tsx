import * as React from 'react'
import type { Control, FieldValues } from 'react-hook-form'
import type * as z from 'zod/v4/core'
import type {
  CoercionMap,
  ComponentRegistry,
  FieldConfig,
  FieldDependencyResult,
  FieldWrapperProps,
  LayoutSlots,
  ResolvedLayoutSlots,
  FormClassNames,
  ValidationMessages,
  FormLabels,
  FormMethods,
} from '../types'
import type { ArrayFieldRegistry } from '../hooks/arrayFieldRegistry'

/**
 * Everything `<AutoForm>` (or `<UniFormProvider>`) publishes to the tree.
 *
 * The generic is inferred for you when you pass the form definition:
 * `useAutoFormContext(myForm)`. Without it the values default to
 * `FieldValues`, which keeps every existing call site compiling.
 *
 * @template TValues - The inferred shape of the form values.
 */
export type AutoFormContextValue<TValues extends FieldValues = FieldValues> = {
  /** @public Component registry in effect for this form. */
  registry: ComponentRegistry
  /** @public Introspected field configs with `fields` overrides merged in. */
  fieldConfigs: FieldConfig[]
  /** @internal Field configs after the full pipeline (handlers, conditions, dynamic meta). */
  resolvedFields: FieldConfig[]
  /** @internal Raw `fields` prop, kept for override lookups. */
  fieldOverrides: Record<string, unknown>
  /** @public The wrapper rendered around every leaf field. */
  fieldWrapper: React.ComponentType<FieldWrapperProps>
  /** @public Fully resolved layout slots. */
  layout: ResolvedLayoutSlots
  /** @internal The raw layout prop, needed for per-section config. */
  layoutSlots?: LayoutSlots
  /** @public CSS class names in effect for this form. */
  classNames: FormClassNames
  /** @public Whether the whole form is disabled. */
  disabled: boolean
  /** @public Coercion map applied before validation. */
  coercions?: CoercionMap
  /** @public Validation message overrides. */
  messages?: ValidationMessages
  /** @public UI strings (submit, array buttons, aria labels). */
  labels: FormLabels
  /** @public Typed programmatic form control methods. */
  formMethods: FormMethods<TValues>
  /** @public react-hook-form control for the underlying store. */
  control: Control<TValues>
  /** @internal Dynamic meta setter used by `setFieldMeta`. */
  setDynamicMeta: React.Dispatch<
    React.SetStateAction<Record<string, Partial<FieldDependencyResult>>>
  >
  /** @internal Live row operations published by every mounted `ArrayField`. */
  arrayFields: ArrayFieldRegistry
}

const AutoFormContext =
  React.createContext<AutoFormContextValue<FieldValues> | null>(null)

/**
 * Read the form context from any component rendered under `<AutoForm>` or
 * `<UniFormProvider>`.
 *
 * Pass the form definition to infer the schema's value type with no casts —
 * this is the recommended form.
 *
 * @example
 * const { formMethods } = useAutoFormContext(requisitionForm)
 * formMethods.setValue('sectors', nextSectors) // fully typed
 *
 * @example
 * // Explicit type argument, when you have no instance to hand:
 * const { control } = useAutoFormContext<RequisitionValues>()
 */
export function useAutoFormContext<TSchema extends z.$ZodObject>(form: {
  readonly schema: TSchema
}): AutoFormContextValue<z.infer<TSchema>>
export function useAutoFormContext<
  TValues extends FieldValues = FieldValues,
>(): AutoFormContextValue<TValues>
export function useAutoFormContext(
  form?: unknown,
): AutoFormContextValue<FieldValues> {
  const ctx = React.useContext(AutoFormContext)
  const fromInstance = getInstanceContext(form)
  const resolved = fromInstance ?? ctx
  if (!resolved) {
    throw new Error(
      '[UniForm] useAutoFormContext must be used inside an <AutoForm> or <UniFormProvider> component.',
    )
  }
  return resolved
}

/** Context lookup that returns `undefined` instead of throwing. @internal */
export function useOptionalAutoFormContext(
  form?: unknown,
): AutoFormContextValue<FieldValues> | undefined {
  const ctx = React.useContext(AutoFormContext)
  return getInstanceContext(form) ?? ctx ?? undefined
}

/**
 * A `useUniForm` result carries its own context, so hooks given the live
 * instance work even in the component that created it — above the provider.
 */
function getInstanceContext(
  form: unknown,
): AutoFormContextValue<FieldValues> | undefined {
  if (typeof form !== 'object' || form === null) return undefined
  const candidate = (form as { _context?: unknown })._context
  return candidate
    ? (candidate as AutoFormContextValue<FieldValues>)
    : undefined
}

export const AutoFormContextProvider = AutoFormContext.Provider

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
  GetOptionKey,
  IsOptionEqual,
} from '../types'
import type { ArrayFieldRegistry } from '../hooks/arrayFieldRegistry'

/**
 * The parts of the context that exist only to make UniForm's own components
 * work. They are not covered by semver — read them at your own risk, and open
 * an issue if you need something here promoted to the supported surface.
 */
export type AutoFormInternals = {
  /** Field configs after the full pipeline (handlers, conditions, dynamic meta). */
  resolvedFields: FieldConfig[]
  /** Raw `fields` prop, kept for override lookups. */
  fieldOverrides: Record<string, unknown>
  /** The raw layout prop, needed for per-section config. */
  layoutSlots?: LayoutSlots
  /** Dynamic meta setter used by `setFieldMeta`. */
  setDynamicMeta: React.Dispatch<
    React.SetStateAction<Record<string, Partial<FieldDependencyResult>>>
  >
  /** Live row operations published by every mounted `ArrayField`. */
  arrayFields: ArrayFieldRegistry
}

/**
 * Everything `<AutoForm>` (or `<UniFormProvider>`) publishes to the tree.
 *
 * The generic is inferred for you when you pass the form definition:
 * `useAutoFormContext(myForm)`. Without it the values default to
 * `FieldValues`, which keeps every existing call site compiling.
 *
 * Members documented `@public` are the supported surface. Everything UniForm
 * uses to render itself lives under {@link AutoFormContextValue._internal} and
 * may change in a minor release.
 *
 * @template TValues - The inferred shape of the form values.
 */
export type AutoFormContextValue<TValues extends FieldValues = FieldValues> = {
  /** @public Component registry in effect for this form. */
  registry: ComponentRegistry
  /** @public Introspected field configs with `fields` overrides merged in. */
  fieldConfigs: FieldConfig[]
  /** @public The wrapper rendered around every leaf field. */
  fieldWrapper: React.ComponentType<FieldWrapperProps>
  /** @public Fully resolved layout slots. */
  layout: ResolvedLayoutSlots
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
  /** @public Form-wide option key derivation; per-field `meta` wins. */
  getOptionKey?: GetOptionKey
  /** @public Form-wide option equality; per-field `meta` wins. */
  isOptionEqual?: IsOptionEqual
  /** @public Typed programmatic form control methods. */
  formMethods: FormMethods<TValues>
  /** @public react-hook-form control for the underlying store. */
  control: Control<TValues>
  /** @public UniForm's own rendering internals. Not covered by semver. */
  _internal: AutoFormInternals

  /**
   * @deprecated Moved to `_internal.resolvedFields`. The alias will be removed
   * in the next minor release.
   */
  resolvedFields: FieldConfig[]
  /**
   * @deprecated Moved to `_internal.fieldOverrides`. The alias will be removed
   * in the next minor release.
   */
  fieldOverrides: Record<string, unknown>
  /**
   * @deprecated Moved to `_internal.layoutSlots`. The alias will be removed in
   * the next minor release.
   */
  layoutSlots?: LayoutSlots
  /**
   * @deprecated Moved to `_internal.setDynamicMeta`. The alias will be removed
   * in the next minor release.
   */
  setDynamicMeta: React.Dispatch<
    React.SetStateAction<Record<string, Partial<FieldDependencyResult>>>
  >
  /**
   * @deprecated Moved to `_internal.arrayFields`. The alias will be removed in
   * the next minor release.
   */
  arrayFields: ArrayFieldRegistry
}

/**
 * Publishes the internals under `_internal` while keeping the deprecated
 * top-level aliases pointing at the same objects.
 */
export function withInternals<TValues extends FieldValues>(
  supported: Omit<
    AutoFormContextValue<TValues>,
    keyof AutoFormInternals | '_internal'
  >,
  internals: AutoFormInternals,
): AutoFormContextValue<TValues> {
  return { ...supported, ...internals, _internal: internals }
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

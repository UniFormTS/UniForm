import * as React from 'react'
import { useForm, useWatch, type Resolver, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type * as z from 'zod/v4/core'
import type {
  ComponentRegistry,
  CoercionMap,
  FieldCondition,
  FieldMeta,
  FieldOverride,
  FieldRequirement,
  FieldDependencyResult,
  FormClassNames,
  FormLabels,
  FormMethods,
  LayoutSlots,
  PersistStorage,
  ResolvedLayoutSlots,
  ValidationMessages,
  FieldWrapperProps,
  DeepKeys,
  DeepFieldValue,
} from '../types'
import type { UniForm, UniFormContext } from '../UniForm'
import type { AutoFormContextValue } from '../context/AutoFormContext'
import { introspectObjectSchema } from '../introspection/introspect'
import { parseDiscriminatedUnionMeta } from '../introspection/discriminatedUnion'
import { mergeRegistries } from '../registry/mergeRegistries'
import { defaultRegistry } from '../registry/defaultRegistry'
import { DefaultFieldWrapper } from '../components/defaults/DefaultFieldWrapper'
import { resolveLayoutSlots } from '../utils/resolveLayoutSlots'
import { useFormPersistence } from './useFormPersistence'
import { useLatestRef } from './useLatestRef'
import { createArrayFieldRegistry } from './arrayFieldRegistry'
import {
  applyFieldOverrides,
  injectOnChangeHandlers,
  injectConditions,
  injectRequirements,
  applyDynamicMeta,
  buildDefaults,
} from '../utils/fieldPipeline'
import {
  applyRequiredErrors,
  normalizeRootErrors,
  ROOT_ERROR_KEY,
  type RequirementEntry,
} from '../validation/requiredResolver'

/** Brand identifying a `useUniForm` result at runtime and at compile time. */
const UNIFORM_INSTANCE = Symbol.for('uniform.instance')

/**
 * Options accepted by {@link useUniForm}. Mirrors the state-level half of
 * `AutoFormProps` — everything that shapes the form store, the resolver, the
 * field configs and the component registry.
 */
export type UseUniFormOptions<TSchema extends z.$ZodObject> = {
  /** Initial values, or an async loader that resolves them. */
  defaultValues?:
    | Partial<z.infer<TSchema>>
    | (() => Promise<Partial<z.infer<TSchema>>>)
  /** Called with the validated values when the form is submitted successfully. */
  onSubmit?: (values: z.infer<TSchema>) => void | Promise<void>
  components?: ComponentRegistry
  fields?: {
    [K in DeepKeys<z.infer<TSchema>>]?: FieldOverride<
      TSchema,
      DeepFieldValue<z.infer<TSchema>, K>
    >
  }
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
  persistKey?: string
  persistDebounce?: number
  persistStorage?: PersistStorage
  onValuesChange?: (values: z.infer<TSchema>) => void
  labels?: FormLabels
}

/**
 * A live form instance created by {@link useUniForm}. Pass it to
 * `<AutoForm form={instance}>` or `<UniFormProvider form={instance}>`, and to
 * `useAutoFormContext` / `useFormValue` / `useField` for schema inference.
 */
export type UniFormInstance<TSchema extends z.$ZodObject = z.$ZodObject> = {
  /** The Zod schema this instance was built from. */
  readonly schema: TSchema
  /** react-hook-form control for the single underlying store. */
  readonly control: Control<z.infer<TSchema>>
  /** Typed programmatic form control methods. */
  readonly methods: FormMethods<z.infer<TSchema>>
  /** `true` while an async `defaultValues` loader is still pending. */
  readonly isLoading: boolean
  /** Whether a submission is currently in flight. */
  readonly isSubmitting: boolean
  /** Validate and submit — identical to pressing the rendered submit button. */
  readonly submit: (event?: React.BaseSyntheticEvent) => void
  /** Remove the persisted draft for this form's `persistKey`. */
  readonly clearPersistedData: () => void
  /** @internal The context value published to the tree. */
  readonly _context: AutoFormContextValue<z.infer<TSchema>>
  /** @internal Lets `<AutoForm>` supply the submit handler in instance mode. */
  readonly _onSubmitRef: React.RefObject<
    ((values: z.infer<TSchema>) => void | Promise<void>) | undefined
  >
  /** @internal */
  readonly _loadingFallback: React.ReactNode
}

/** Narrows an `AutoForm` `form` prop to a {@link UniFormInstance}. */
export function isUniFormInstance(
  value: unknown,
): value is UniFormInstance<z.$ZodObject> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as Record<symbol, unknown>)[UNIFORM_INSTANCE] === true
  )
}

/**
 * Build a UniForm state container — the react-hook-form store, the Zod
 * resolver, the introspected field configs, the component registry and the
 * persistence wiring — **above** `<AutoForm>`.
 *
 * Use it when the application owns the page layout: read and write form state
 * from your own chrome, render an external submit button, or render no
 * `<AutoForm>` at all and place `<Field>` components wherever you like.
 *
 * @param form - A `createForm(schema)` / `new UniForm(schema)` definition.
 * @param options - Mirrors the state-level `<AutoForm>` props.
 *
 * @example
 * const form = useUniForm(requisitionForm, {
 *   defaultValues,
 *   onSubmit: (values) => save(values),
 * })
 *
 * return (
 *   <PageChrome onSave={form.submit} busy={form.isSubmitting}>
 *     <AutoForm form={form} fields={{ sectors: { component: SectorsField } }} />
 *   </PageChrome>
 * )
 */
export function useUniForm<TSchema extends z.$ZodObject>(
  form: { readonly schema: TSchema },
  options: UseUniFormOptions<TSchema> = {},
): UniFormInstance<TSchema> {
  const {
    defaultValues,
    onSubmit,
    components,
    fields: fieldOverridesProp = {},
    fieldWrapper,
    layout,
    classNames = {},
    disabled = false,
    coercions,
    messages,
    persistKey,
    persistDebounce = 300,
    persistStorage,
    onValuesChange,
    labels = {},
  } = options

  const uniForm = form
  const schema = uniForm.schema

  // For discriminated unions: extract static metadata once
  const unionInfo = React.useMemo(() => {
    const def = schema._zod.def as { type: string }
    if (def.type !== 'union') return null
    return parseDiscriminatedUnionMeta(
      schema as unknown as z.$ZodDiscriminatedUnion,
    )
  }, [schema])

  // Initial field list — for unions, use the first variant so buildDefaults has something
  const rawFields = React.useMemo(() => {
    if (!unionInfo) return introspectObjectSchema(schema)
    const firstVariantFields = introspectObjectSchema(
      unionInfo.firstVariant,
    ).filter((f) => f.name !== unionInfo.discriminatorKey)
    return [unionInfo.discriminatorField, ...firstVariantFields]
  }, [schema, unionInfo])

  const registry = React.useMemo(
    () => mergeRegistries(defaultRegistry, components),
    [components],
  )

  const generatedDefaults = React.useMemo(
    () => buildDefaults(rawFields),
    [rawFields],
  )

  const computedDefaults = React.useMemo(() => {
    const base: Record<string, unknown> = {
      ...generatedDefaults,
      ...(typeof defaultValues === 'function'
        ? {}
        : (defaultValues as Record<string, unknown>)),
    }

    // Collect all conditions: UniForm-registered takes precedence, fields-prop fills gaps
    const conditions = new Map<string, FieldCondition>(
      (uniForm as UniForm<TSchema>)._getConditions() as Map<
        string,
        FieldCondition
      >,
    )
    for (const [name, override] of Object.entries(
      fieldOverridesProp as Record<string, Partial<FieldMeta>>,
    )) {
      if (typeof override.condition === 'function' && !conditions.has(name)) {
        conditions.set(name, override.condition as FieldCondition)
      }
    }

    // Exclude fields whose condition starts false so they're never pre-registered
    // in the RHF store. Evaluated against `base` so fields that start visible
    // (condition true) still receive their default value.
    for (const [name, condition] of conditions) {
      if (!condition(base)) {
        delete base[name]
      }
    }

    return base
  }, [generatedDefaults, defaultValues, uniForm, fieldOverridesProp])

  // Async defaultValues: track whether we are still waiting for the loader
  const isAsyncDefaults = typeof defaultValues === 'function'
  const [isLoadingDefaults, setIsLoadingDefaults] =
    React.useState(isAsyncDefaults)

  // Requiredness predicates from `setRequired` plus any `requiredWhen` given
  // through the `fields` prop. Collected here so the resolver can enforce them.
  const requirements = React.useMemo<RequirementEntry[]>(() => {
    const collected = new Map<string, FieldRequirement>(
      (uniForm as UniForm<TSchema>)._getRequirements?.() ?? [],
    )
    for (const [name, override] of Object.entries(
      fieldOverridesProp as Record<string, Partial<FieldMeta>>,
    )) {
      if (typeof override.requiredWhen === 'function') {
        collected.set(name, override.requiredWhen)
      }
    }
    return Array.from(collected, ([path, predicate]) => ({ path, predicate }))
  }, [uniForm, fieldOverridesProp])

  const requiredMessage = messages?.required ?? 'This field is required'

  const resolver = React.useMemo<Resolver>(() => {
    const base = zodResolver(schema) as unknown as Resolver
    return async (values, context, options) => {
      const result = await base(values, context, options)
      const errors = applyRequiredErrors(
        normalizeRootErrors(result.errors),
        values,
        requirements,
        requiredMessage,
      )
      // A dynamically-required empty field must block submit, so drop `values`
      // whenever we introduce an error the schema did not report.
      return Object.keys(errors).length
        ? { errors, values: {} }
        : { errors: {}, values: result.values }
    }
  }, [schema, requirements, requiredMessage])

  const rhf = useForm({
    resolver,
    defaultValues: computedDefaults,
  })

  const {
    control,
    formState,
    clearErrors,
    getValues,
    handleSubmit,
    reset,
    resetField,
    setValue,
    setError,
    setFocus,
    watch,
  } = rhf

  // For discriminated unions: watch the discriminator and swap to the matching variant's fields
  const discriminatorValue = useWatch({
    control,
    name: (unionInfo?.discriminatorKey ?? '') as never,
    disabled: !unionInfo?.discriminatorKey,
  })

  const activeFields = React.useMemo(() => {
    if (!unionInfo) return rawFields
    const variant = unionInfo.variantMap.get(
      discriminatorValue as unknown as string,
    )
    if (!variant) return [unionInfo.discriminatorField]
    const variantFields = introspectObjectSchema(variant).filter(
      (f) => f.name !== unionInfo.discriminatorKey,
    )
    return [unionInfo.discriminatorField, ...variantFields]
  }, [unionInfo, discriminatorValue, rawFields])

  const mergedFields = React.useMemo(
    () =>
      applyFieldOverrides(
        activeFields,
        fieldOverridesProp as Record<string, Partial<FieldMeta>>,
      ),
    [activeFields, fieldOverridesProp],
  )

  const { clearPersistedData } = useFormPersistence({
    control,
    key: persistKey,
    debounceMs: persistDebounce,
    storage: persistStorage,
    reset: rhf.reset as (values: Record<string, unknown>) => void,
    defaultValues: computedDefaults,
  })

  // Dynamic field meta — updated by setFieldMeta inside UniForm onChange handlers
  const [dynamicMeta, setDynamicMeta] = React.useState<
    Record<string, Partial<FieldDependencyResult>>
  >({})

  const optionOnSubmitRef = useLatestRef(onSubmit)
  const onValuesChangeRef = useLatestRef(onValuesChange)
  const generatedDefaultsRef = useLatestRef(generatedDefaults)

  // `<AutoForm onSubmit>` writes here during render and always wins, so the
  // rendered submit button and an external one run the same handler.
  const overrideOnSubmitRef = React.useRef<
    ((values: z.infer<TSchema>) => void | Promise<void>) | undefined
  >(undefined)

  const onSubmitRef = React.useRef<
    (values: z.infer<TSchema>) => void | Promise<void>
  >(undefined as never)
  onSubmitRef.current = (values) =>
    (overrideOnSubmitRef.current ?? optionOnSubmitRef.current)?.(values)

  // Load async defaultValues once on mount
  React.useEffect(() => {
    if (!isAsyncDefaults) return
    let cancelled = false
    void (defaultValues as () => Promise<Partial<z.infer<TSchema>>>)().then(
      (vals) => {
        if (cancelled) return
        rhf.reset({ ...generatedDefaultsRef.current, ...vals })
        setIsLoadingDefaults(false)
      },
    )
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const formMethods = React.useMemo<FormMethods<z.infer<TSchema>>>(
    () => ({
      setValue: (name, value, options) =>
        setValue(name as string, value, {
          shouldValidate: true,
          shouldDirty: true,
          ...options,
        }),
      setValues: (values) => {
        for (const [key, val] of Object.entries(values)) {
          setValue(key, val, { shouldValidate: true, shouldDirty: true })
        }
      },
      getValues: () => getValues() as z.infer<TSchema>,
      resetField: (name) => resetField(name),
      reset: (values) => {
        if (values) {
          reset({ ...getValues(), ...values })
        } else {
          reset()
        }
        // Clear dynamic meta so overrides don't persist after a reset
        setDynamicMeta({})
      },
      setError: (name, message) => setError(name, { type: 'manual', message }),
      setErrors: (errors) => {
        for (const [key, message] of Object.entries(errors)) {
          setError(key, { type: 'manual', message: message as string })
        }
      },
      setIssues: (issues) => {
        for (const { path, message } of issues) {
          setError(path === '' ? ROOT_ERROR_KEY : path, {
            type: 'manual',
            message,
          })
        }
      },
      clearErrors: (names?) => clearErrors(names),
      submit: () => {
        void handleSubmit((values) =>
          onSubmitRef.current(values as z.infer<TSchema>),
        )()
      },
      focus: (fieldName) => setFocus(fieldName),
      watch: watch as FormMethods<z.infer<TSchema>>['watch'],
    }),
    [
      clearErrors,
      getValues,
      handleSubmit,
      reset,
      resetField,
      setValue,
      setError,
      setFocus,
      watch,
    ],
  )

  // setFieldMeta: called synchronously inside UniForm onChange handlers.
  // Updates dynamicMeta state; use ctx.setValue() directly to set a field value.
  const setFieldMeta = React.useCallback(
    (field: string, meta: Partial<FieldDependencyResult>) => {
      if (Object.keys(meta).length) {
        setDynamicMeta((prev) => ({
          ...prev,
          [field]: { ...prev[field], ...meta },
        }))
      }
    },
    [],
  )

  // Build the UniForm context — stable when formMethods and setFieldMeta are stable
  const uniFormCtx = React.useMemo<UniFormContext<TSchema>>(
    () => ({ ...formMethods, setFieldMeta }),
    [formMethods, setFieldMeta],
  )

  // Inject UniForm handlers into field.meta.onChange so they fire as real event handlers
  const fieldsWithHandlers = React.useMemo(
    () =>
      injectOnChangeHandlers(
        mergedFields,
        uniForm as UniForm<TSchema>,
        uniFormCtx,
      ),
    [mergedFields, uniForm, uniFormCtx],
  )

  // Inject UniForm conditions into field.meta.condition
  const fieldsWithConditions = React.useMemo(
    () =>
      injectConditions(
        fieldsWithHandlers,
        (uniForm as UniForm<TSchema>)._getConditions() as Map<
          string,
          FieldCondition
        >,
      ),
    [fieldsWithHandlers, uniForm],
  )

  // Inject UniForm requiredness predicates into field.meta.requiredWhen
  const fieldsWithRequirements = React.useMemo(() => {
    const map = new Map<string, FieldRequirement>(
      requirements.map((r) => [r.path, r.predicate as FieldRequirement]),
    )
    return injectRequirements(fieldsWithConditions, map)
  }, [fieldsWithConditions, requirements])

  // Apply event-driven dynamic meta overrides (from setFieldMeta calls)
  const resolvedFields = React.useMemo(
    () => applyDynamicMeta(fieldsWithRequirements, dynamicMeta),
    [fieldsWithRequirements, dynamicMeta],
  )

  const allValues = useWatch({ control, disabled: !onValuesChange })

  React.useEffect(() => {
    if (!onValuesChangeRef.current) return
    onValuesChangeRef.current(allValues as z.infer<TSchema>)
  }, [onValuesChangeRef, allValues])

  const resolvedLayout = React.useMemo(
    (): ResolvedLayoutSlots => resolveLayoutSlots(layout),
    [layout],
  )

  const resolvedFieldWrapper = fieldWrapper ?? DefaultFieldWrapper

  const [arrayFields] = React.useState(createArrayFieldRegistry)

  const submit = React.useCallback(
    (event?: React.BaseSyntheticEvent) => {
      void handleSubmit(async (values) => {
        await onSubmitRef.current(values as z.infer<TSchema>)
        clearPersistedData()
      })(event)
    },
    [handleSubmit, clearPersistedData],
  )

  const context = React.useMemo<AutoFormContextValue<z.infer<TSchema>>>(
    () => ({
      registry,
      fieldConfigs: mergedFields,
      resolvedFields,
      fieldOverrides: fieldOverridesProp,
      fieldWrapper: resolvedFieldWrapper,
      layout: resolvedLayout,
      layoutSlots: layout,
      classNames,
      disabled,
      coercions,
      messages,
      labels,
      formMethods: formMethods as unknown as FormMethods<z.infer<TSchema>>,
      control: control as unknown as Control<z.infer<TSchema>>,
      setDynamicMeta,
      arrayFields,
    }),
    [
      registry,
      mergedFields,
      resolvedFields,
      fieldOverridesProp,
      resolvedFieldWrapper,
      resolvedLayout,
      layout,
      classNames,
      disabled,
      coercions,
      messages,
      labels,
      formMethods,
      control,
      setDynamicMeta,
      arrayFields,
    ],
  )

  const instance = React.useMemo<UniFormInstance<TSchema>>(() => {
    const value = {
      schema,
      control: control as unknown as Control<z.infer<TSchema>>,
      methods: formMethods,
      isLoading: isLoadingDefaults,
      isSubmitting: formState.isSubmitting,
      submit,
      clearPersistedData,
      _context: context,
      _onSubmitRef: overrideOnSubmitRef,
      _loadingFallback: resolvedLayout.loadingFallback,
    } as UniFormInstance<TSchema>
    Object.defineProperty(value, UNIFORM_INSTANCE, {
      value: true,
      enumerable: false,
    })
    return value
  }, [
    schema,
    control,
    formMethods,
    isLoadingDefaults,
    formState.isSubmitting,
    submit,
    clearPersistedData,
    context,
    overrideOnSubmitRef,
    resolvedLayout.loadingFallback,
  ])

  return instance
}

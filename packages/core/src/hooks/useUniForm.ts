import * as React from 'react'
import { useForm, useWatch, type Resolver, type Control } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type * as z from 'zod/v4/core'
import type {
  ComponentRegistry,
  CoercionMap,
  FieldCondition,
  FieldConfig,
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
  SetValueOptions,
  ValidationMessages,
  FieldWrapperProps,
  GetOptionKey,
  IsOptionEqual,
  DeepKeys,
  DeepFieldValue,
} from '../types'
import type { UniForm, UniFormContext } from '../UniForm'
import type { AutoFormContextValue } from '../context/AutoFormContext'
import { withInternals } from '../context/AutoFormContext'
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
  injectDependencyPropagation,
  injectOptionIdentity,
  applyDynamicMeta,
  buildDefaults,
} from '../utils/fieldPipeline'
import {
  applyRequiredErrors,
  normalizeRootErrors,
  ROOT_ERROR_KEY,
  type RequirementEntry,
} from '../validation/requiredResolver'
import { isChainVisible, resolveFieldAt } from '../utils/resolveFieldAt'

/** Brand identifying a `useUniForm` result at runtime and at compile time. */
const UNIFORM_INSTANCE = Symbol.for('uniform.instance')

// Stable fallbacks, so an omitted prop does not rebuild the pipeline each render.
const NO_OVERRIDES = {}
const NO_CLASSNAMES: FormClassNames = {}
const NO_LABELS: FormLabels = {}
const ALWAYS_REQUIRED = () => true

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

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
  persistVersion?: number
  persistMigrate?: (
    persisted: unknown,
    fromVersion: number,
  ) => Partial<z.infer<TSchema>> | undefined
  /** Dot paths never written to storage — passwords, card numbers, tokens. */
  persistExclude?: readonly DeepKeys<z.infer<TSchema>>[]
  onValuesChange?: (values: z.infer<TSchema>) => void
  labels?: FormLabels
  getOptionKey?: GetOptionKey
  isOptionEqual?: IsOptionEqual
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
  /** @internal Runs handlers, conditions, requirements and dynamic meta over `fields`. */
  readonly _runPipeline: (fields: FieldConfig[]) => FieldConfig[]
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
    fields: fieldOverridesProp = NO_OVERRIDES,
    fieldWrapper,
    layout,
    classNames = NO_CLASSNAMES,
    disabled = false,
    coercions,
    messages,
    persistKey,
    persistDebounce = 300,
    persistStorage,
    persistVersion,
    persistMigrate,
    persistExclude,
    onValuesChange,
    labels = NO_LABELS,
    getOptionKey,
    isOptionEqual,
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

  // Read by the resolver at validation time, so dynamic requiredness and the
  // current visibility apply without rebuilding the resolver.
  const resolverStateRef = React.useRef<{
    requirements: RequirementEntry[]
    optional: ReadonlySet<string>
    fields: FieldConfig[]
    message: string
  }>({
    requirements,
    optional: new Set(),
    fields: [],
    message: requiredMessage,
  })

  const resolver = React.useMemo<Resolver>(() => {
    const base = zodResolver(schema) as unknown as Resolver
    return async (values, context, options) => {
      const result = await base(values, context, options)
      const state = resolverStateRef.current
      const errors = applyRequiredErrors(
        normalizeRootErrors(result.errors),
        values,
        state.requirements,
        state.message,
        // A field hidden by a condition, or outside the active union variant,
        // can never be filled in — it must not block submit.
        (path) => {
          if (state.optional.has(path)) return false
          const resolved = resolveFieldAt(state.fields, path)
          return !!resolved && isChainVisible(resolved.chain, values)
        },
      )
      // A dynamically-required empty field must block submit, so drop `values`
      // whenever we introduce an error the schema did not report.
      return Object.keys(errors).length
        ? { errors, values: {} }
        : { errors: {}, values: result.values }
    }
  }, [schema])

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
    trigger,
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
      injectOptionIdentity(
        applyFieldOverrides(
          activeFields,
          fieldOverridesProp as Record<string, Partial<FieldMeta>>,
        ),
        getOptionKey,
        isOptionEqual,
      ),
    [activeFields, fieldOverridesProp, getOptionKey, isOptionEqual],
  )

  // Async `defaultValues` and a restored draft can land in either order; each
  // re-applies the other so neither wipes the other out.
  const computedDefaultsRef = useLatestRef(computedDefaults)
  const loadedValuesRef = React.useRef<Record<string, unknown>>({})
  const draftRef = React.useRef<Record<string, unknown>>({})

  const restoreDraft = React.useCallback(
    (draft: Record<string, unknown>) => {
      draftRef.current = draft
      reset({
        ...computedDefaultsRef.current,
        ...loadedValuesRef.current,
        ...draft,
      })
    },
    [reset, computedDefaultsRef],
  )

  const { clearPersistedData, hasPersistedDraft, isRestoring } =
    useFormPersistence({
      watch: watch as unknown as Parameters<
        typeof useFormPersistence
      >[0]['watch'],
      getValues,
      key: persistKey,
      debounceMs: persistDebounce,
      storage: persistStorage,
      restore: restoreDraft,
      version: persistVersion,
      migrate: persistMigrate as
        | ((
            persisted: unknown,
            fromVersion: number,
          ) => Record<string, unknown> | undefined)
        | undefined,
      exclude: persistExclude as readonly string[] | undefined,
    })

  // Dynamic field meta — updated by setFieldMeta inside UniForm onChange handlers
  const [dynamicMeta, setDynamicMeta] = React.useState<
    Record<string, Partial<FieldDependencyResult>>
  >({})

  const optionOnSubmitRef = useLatestRef(onSubmit)
  const onValuesChangeRef = useLatestRef(onValuesChange)
  const generatedDefaultsRef = useLatestRef(generatedDefaults)

  // `<AutoForm onSubmit>` sets this after commit and always wins, so the
  // rendered submit button and an external one run the same handler.
  const overrideOnSubmitRef = React.useRef<
    ((values: z.infer<TSchema>) => void | Promise<void>) | undefined
  >(undefined)

  const onSubmitRef = React.useRef<
    (values: z.infer<TSchema>) => void | Promise<void>
  >(undefined as never)
  onSubmitRef.current = (values) =>
    (overrideOnSubmitRef.current ?? optionOnSubmitRef.current)?.(values)

  const writeValue = React.useCallback(
    (name: string, value: unknown, options?: SetValueOptions) => {
      setValue(name, value, {
        shouldValidate: true,
        shouldDirty: true,
        ...options,
      })
    },
    [setValue],
  )

  const writeValues = React.useCallback(
    (values: Record<string, unknown>, options?: SetValueOptions) => {
      const { shouldValidate = true, ...rest } = options ?? {}
      const entries = Object.entries(values)
      for (const [key, val] of entries) {
        setValue(key, val, {
          shouldDirty: true,
          ...rest,
          shouldValidate: false,
        })
      }
      // One validation pass for the keys written, not one per key and not the
      // whole form (which would surface errors on untouched fields).
      if (shouldValidate && entries.length) {
        void trigger(entries.map(([key]) => key) as never)
      }
      return entries
    },
    [setValue, trigger],
  )

  // Dependency propagation. One pass over the topologically-sorted closure per
  // logical change: writes made by resolvers do not start a new cascade, so
  // the model stays bounded no matter how the graph is shaped.
  const uniFormCtxRef = React.useRef<UniFormContext<TSchema>>(
    undefined as never,
  )
  const isPropagatingRef = React.useRef(false)
  // The latest run that owns each dependent field; a newer run aborts it.
  const runsRef = React.useRef(new Map<string, AbortController>())

  React.useEffect(() => {
    const runs = runsRef.current
    return () => {
      for (const controller of runs.values()) controller.abort()
    }
  }, [])

  const propagate = React.useCallback(
    (source: string, value: unknown) => {
      const form = uniForm as UniForm<TSchema>
      if (isPropagatingRef.current || !form._hasDependencies?.()) return
      const order = form._getPropagationOrder(source)
      if (!order.length) return

      const controller = new AbortController()
      const { signal } = controller
      for (const field of order) {
        runsRef.current.get(field)?.abort()
        runsRef.current.set(field, controller)
      }

      // Writes from a superseded run are dropped, so a slow response for an
      // old value can never overwrite the state for the new one.
      const live =
        <A extends unknown[]>(fn: (...args: A) => unknown) =>
        (...args: A) => {
          if (!signal.aborted) fn(...args)
        }
      const base = uniFormCtxRef.current
      const ctx = {
        ...base,
        setValue: live(writeValue),
        setValues: live(writeValues),
        setFieldMeta: live(base.setFieldMeta),
      } as UniFormContext<TSchema>

      // Synchronous resolvers run inline; an async one is awaited before the
      // fields downstream of it resolve.
      const run = (from: number): void => {
        for (let i = from; i < order.length; i++) {
          if (signal.aborted) return
          const field = order[i]
          const result = form._resolveDependency(field, {
            source,
            value,
            field,
            ctx,
            signal,
          })
          if (isThenable(result)) {
            result.then(
              () => run(i + 1),
              (error: unknown) => {
                if (signal.aborted) return
                console.error(
                  `[UniForm] The dependency resolver for "${field}" failed; ` +
                    'fields downstream of it were not resolved.',
                  error,
                )
              },
            )
            return
          }
        }
      }

      isPropagatingRef.current = true
      try {
        run(0)
      } finally {
        isPropagatingRef.current = false
      }
    },
    [uniForm, writeValue, writeValues],
  )

  // Load async defaultValues once on mount
  React.useEffect(() => {
    if (!isAsyncDefaults) return
    let cancelled = false
    let pending: Promise<Partial<z.infer<TSchema>>>
    try {
      pending = (defaultValues as () => Promise<Partial<z.infer<TSchema>>>)()
    } catch (error) {
      pending = Promise.reject(error as Error)
    }
    pending.then(
      (vals) => {
        if (cancelled) return
        loadedValuesRef.current = vals as Record<string, unknown>
        reset({
          ...generatedDefaultsRef.current,
          ...vals,
          ...draftRef.current,
        })
        setIsLoadingDefaults(false)
      },
      (error: unknown) => {
        if (cancelled) return
        console.error(
          '[UniForm] The async defaultValues loader rejected; the form is ' +
            'shown with its generated defaults.',
          error,
        )
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
      setValue: (name, value, options) => {
        writeValue(name as string, value, options)
        propagate(name as string, value)
      },
      setValues: (values, options) => {
        const entries = writeValues(values as Record<string, unknown>, options)
        for (const [key, val] of entries) propagate(key, val)
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
      clearPersistedData,
      hasPersistedDraft,
    }),
    [
      clearErrors,
      getValues,
      handleSubmit,
      reset,
      resetField,
      setError,
      setFocus,
      watch,
      writeValue,
      writeValues,
      propagate,
      clearPersistedData,
      hasPersistedDraft,
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
  uniFormCtxRef.current = uniFormCtx

  const requirementMap = React.useMemo(
    () =>
      new Map<string, FieldRequirement>(
        requirements.map((r) => [r.path, r.predicate as FieldRequirement]),
      ),
    [requirements],
  )

  // Everything after `fields` overrides: UniForm handlers, conditions and
  // requiredness, dependency propagation, then event-driven dynamic meta.
  // `<AutoForm form={instance} fields>` re-runs it so those keep precedence.
  const runPipeline = React.useCallback(
    (fields: FieldConfig[]) => {
      const typedForm = uniForm as UniForm<TSchema>
      const withHandlers = injectOnChangeHandlers(fields, typedForm, uniFormCtx)
      const withConditions = injectConditions(
        withHandlers,
        typedForm._getConditions() as Map<string, FieldCondition>,
      )
      const withRequirements = injectRequirements(
        withConditions,
        requirementMap,
      )
      const withDependencies = injectDependencyPropagation(
        withRequirements,
        new Set(typedForm._getDependencySources?.() ?? []),
        propagate,
      )
      return applyDynamicMeta(withDependencies, dynamicMeta)
    },
    [uniForm, uniFormCtx, requirementMap, propagate, dynamicMeta],
  )

  const resolvedFields = React.useMemo(
    () => runPipeline(mergedFields),
    [runPipeline, mergedFields],
  )

  // `setFieldMeta(path, { required })` drives submit exactly as it drives the
  // marker: `true` blocks like `setRequired`, `false` lifts a `setRequired`.
  const dynamicRequiredness = React.useMemo(() => {
    const required: RequirementEntry[] = []
    const optional = new Set<string>()
    for (const [path, meta] of Object.entries(dynamicMeta)) {
      if (meta.required === true) {
        required.push({ path, predicate: ALWAYS_REQUIRED })
      } else if (meta.required === false) {
        optional.add(path)
      }
    }
    return { required, optional }
  }, [dynamicMeta])

  resolverStateRef.current = {
    requirements: dynamicRequiredness.required.length
      ? [...requirements, ...dynamicRequiredness.required]
      : requirements,
    optional: dynamicRequiredness.optional,
    fields: resolvedFields,
    message: requiredMessage,
  }

  // Subscribe instead of `useWatch`, so the host does not re-render (and
  // re-publish its context) on every keystroke.
  const hasValuesListener = onValuesChange !== undefined
  React.useEffect(() => {
    if (!hasValuesListener) return
    onValuesChangeRef.current?.(getValues() as z.infer<TSchema>)
    const subscription = watch((values) =>
      onValuesChangeRef.current?.(values as z.infer<TSchema>),
    )
    return () => subscription.unsubscribe()
  }, [hasValuesListener, watch, getValues, onValuesChangeRef])

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
    () =>
      withInternals(
        {
          registry,
          fieldConfigs: mergedFields,
          fieldWrapper: resolvedFieldWrapper,
          layout: resolvedLayout,
          classNames,
          disabled,
          coercions,
          messages,
          labels,
          getOptionKey,
          isOptionEqual,
          formMethods: formMethods as unknown as FormMethods<z.infer<TSchema>>,
          control: control as unknown as Control<z.infer<TSchema>>,
        },
        {
          resolvedFields,
          fieldOverrides: fieldOverridesProp,
          layoutSlots: layout,
          setDynamicMeta,
          arrayFields,
        },
      ),
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
      getOptionKey,
      isOptionEqual,
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
      isLoading: isLoadingDefaults || isRestoring,
      isSubmitting: formState.isSubmitting,
      submit,
      clearPersistedData,
      _context: context,
      _onSubmitRef: overrideOnSubmitRef,
      _runPipeline: runPipeline,
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
    isRestoring,
    formState.isSubmitting,
    submit,
    clearPersistedData,
    context,
    overrideOnSubmitRef,
    runPipeline,
    resolvedLayout.loadingFallback,
  ])

  return instance
}

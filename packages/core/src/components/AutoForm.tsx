import * as React from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type * as z from 'zod/v4/core'
import type {
  AutoFormProps,
  AutoFormHandle,
  DeepPartial,
  FieldCondition,
  FieldConfig,
  FieldMeta,
  FormMethods,
  FieldDependencyResult,
  FormClassNames,
  FormLabels,
  ResolvedLayoutSlots,
} from '../types'
import type { UniForm, UniFormContext } from '../UniForm'
import { introspectObjectSchema } from '../introspection/introspect'
import { parseDiscriminatedUnionMeta } from '../introspection/discriminatedUnion'
import { mergeRegistries } from '../registry/mergeRegistries'
import { defaultRegistry } from '../registry/defaultRegistry'
import { DefaultFieldWrapper } from './defaults/DefaultFieldWrapper'
import { DefaultSubmitButton } from './defaults/DefaultSubmitButton'
import { DefaultFormWrapper } from './defaults/DefaultFormWrapper'
import { DefaultSectionWrapper } from './defaults/DefaultSectionWrapper'
import { DefaultArrayRowLayout } from './defaults/DefaultArrayRowLayout'
import { DefaultArrayFieldLayout } from './defaults/DefaultArrayFieldLayout'
import { DefaultObjectWrapper } from './defaults/DefaultObjectWrapper'
import { DefaultArrayWrapper } from './defaults/DefaultArrayWrapper'
import { DefaultArrayButton } from './defaults/DefaultArrayButton'
import { DefaultArrayCollapseButton } from './defaults/DefaultArrayCollapseButton'
import { AutoFormContextProvider } from '../context/AutoFormContext'
import { createArrayRegistry } from '../context/arrayRegistry'
import { FieldRenderer } from './FieldRenderer'
import { useConditionalFields } from '../hooks/useConditionalFields'
import { useSectionGrouping } from '../hooks/useSectionGrouping'
import { useFormPersistence } from '../hooks/useFormPersistence'
import { useLatestRef } from '../hooks/useLatestRef'
import {
  applyFieldOverrides,
  buildVisibilityFields,
  injectOnChangeHandlers,
  buildDefaults,
} from '../utils/fieldPipeline'
import { resolveNullableSlot } from '../utils/resolveNullableSlot'
import { mergeDefaults } from '../utils/mergeDefaults'
import {
  reindexDynamicMeta,
  type MutationType,
} from '../utils/reindexDynamicMeta'
import {
  analyzeVisibility,
  collectStaticHiddenSchemaPaths,
  omitSchemaPath,
  collectHiddenFields,
  rowIndicesStable,
  splitHidden,
  cloneValue,
  omitErrorsAt,
  omitPaths,
  createDerivedSchemaCache,
} from '../utils/hiddenFields'
import { getAtPath } from '../utils/getAtPath'
import { getDefaultValue } from './fields/getDefaultValue'
import { normalizeEmptyValues } from '../utils/normalizeEmptyValues'

// Shared defaults keep the context value stable across re-renders
const EMPTY_FIELDS = {}
const EMPTY_CLASS_NAMES: FormClassNames = {}
const EMPTY_LABELS: FormLabels = {}

/**
 * The core auto-form component. Introspects the provided Zod `schema`,
 * renders the appropriate field components, validates on submit using
 * `zodResolver`, and calls `onSubmit` with the fully-typed, validated values.
 *
 * Supports: conditional fields, dynamic field meta via UniForm onChange
 * handlers, section grouping, form persistence, imperative handle via `ref`,
 * and full layout/component customisation.
 *
 * @template TSchema - A `ZodObject` schema that defines the form shape.
 *
 * @example
 * const myForm = new UniForm(z.object({ name: z.string(), age: z.number() }))
 *
 * <AutoForm form={myForm} onSubmit={(values) => console.log(values)} />
 */
export function AutoForm<TSchema extends z.$ZodObject>(
  props: AutoFormProps<TSchema> & {
    ref?: React.Ref<AutoFormHandle<TSchema>>
  },
) {
  const {
    form: uniForm,
    onSubmit,
    defaultValues,
    components,
    fields: fieldOverridesProp = EMPTY_FIELDS,
    fieldWrapper,
    layout,
    classNames = EMPTY_CLASS_NAMES,
    disabled = false,
    coercions,
    messages,
    persistKey,
    persistDebounce = 300,
    persistStorage,
    onValuesChange,
    labels = EMPTY_LABELS,
    ref,
  } = props

  const schema = uniForm.schema

  // For discriminated unions: extract static metadata once
  const unionInfo = React.useMemo(() => {
    const def = schema._zod.def as { type: string }
    if (def.type !== 'union') return null
    return parseDiscriminatedUnionMeta(
      schema as unknown as z.$ZodDiscriminatedUnion,
    )
  }, [schema])

  // Initial field list — for unions, the discriminator plus the first variant
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

  // Mirrors FieldRenderer: a component function, or a key in the registry
  const isCustomRendered = React.useCallback(
    (field: FieldConfig) =>
      typeof field.meta.component === 'function' ||
      (typeof field.meta.component === 'string' &&
        Object.prototype.hasOwnProperty.call(registry, field.meta.component)),
    [registry],
  )
  const isCustomRenderedRef = useLatestRef(isCustomRendered)

  const generatedDefaults = React.useMemo(() => {
    const defaults = buildDefaults(rawFields)
    if (!unionInfo) return defaults
    // Seed every variant's fields so switching variants never leaves a field
    // `undefined`. Merged recursively; earlier variants win only where keys
    // actually conflict. Inactive variants' keys are dropped before validation
    // (see `resolver` below).
    let seeded = defaults
    for (const variant of unionInfo.variantMap.values()) {
      seeded = mergeDefaults(
        buildDefaults(introspectObjectSchema(variant)),
        seeded,
      )
    }
    return seeded
  }, [rawFields, unionInfo])

  const computedDefaults = React.useMemo(() => {
    const base = mergeDefaults(
      generatedDefaults,
      typeof defaultValues === 'function'
        ? undefined
        : (defaultValues as Record<string, unknown> | undefined),
    )

    // Fields that start hidden keep their defaults: hidden values are never
    // validated or submitted (see `resolver`), and a field shown later starts
    // from its default instead of `undefined`.
    return base
  }, [generatedDefaults, defaultValues])

  // Async defaultValues: track whether we are still waiting for the loader
  const isAsyncDefaults = typeof defaultValues === 'function'
  const [isLoadingDefaults, setIsLoadingDefaults] =
    React.useState(isAsyncDefaults)

  // The discriminator selects the variant, so hiding it only hides its input:
  // its value is always validated and submitted, and never reset.
  const discriminatorKey = unionInfo?.discriminatorKey
  const isStructural = React.useCallback(
    (path: string) => path === discriminatorKey,
    [discriminatorKey],
  )

  // The field list for the variant that `values` select (for discriminated
  // unions), or all fields. Shared by validation and hidden-field syncing.
  const variantFieldsMap = React.useMemo(
    () =>
      unionInfo
        ? new Map(
            [...unionInfo.variantMap].map(([value, variant]) => [
              value,
              introspectObjectSchema(variant).filter(
                (f) => f.name !== unionInfo.discriminatorKey,
              ),
            ]),
          )
        : undefined,
    [unionInfo],
  )
  const activeFieldsFor = React.useCallback(
    (values: Record<string, unknown>): FieldConfig[] => {
      if (!unionInfo || !variantFieldsMap) return rawFields
      const variantFields = variantFieldsMap.get(
        String(values[unionInfo.discriminatorKey]),
      )
      return [unionInfo.discriminatorField, ...(variantFields ?? [])]
    },
    [unionInfo, variantFieldsMap, rawFields],
  )

  // Applies the current overrides, conditions and dynamic meta to a field list,
  // so the resolver can find hidden fields for whichever variant it validates.
  // Kept current below, once dynamic meta exists.
  const toVisibilityFieldsRef = React.useRef<
    (fields: FieldConfig[]) => FieldConfig[]
  >((fields) => fields)

  // Before validation:
  // - for discriminated unions, keep only the active variant's keys, so other
  //   variants' seeded or previously entered values are neither rejected by
  //   strict variants nor passed through by loose ones;
  // - drop hidden fields' values (hidden fields are neither validated nor
  //   submitted) and ignore their errors; if only hidden fields failed, parse
  //   again with those paths made optional so `onSubmit` still gets Zod output;
  // - map empty inputs ('' in form state) to the schema's empty value.
  const resolver = React.useMemo((): Resolver => {
    const validate = (s: z.$ZodType): Resolver =>
      zodResolver(s as TSchema) as unknown as Resolver
    const schemaFor = createDerivedSchemaCache()
    const base = validate(schema)

    return async (values, context, options) => {
      let activeValues = values as Record<string, unknown>
      if (unionInfo) {
        const active = String(activeValues[unionInfo.discriminatorKey])
        const variant = unionInfo.variantMap.get(active)
        if (!variant) return base(values, context, options)
        activeValues = {}
        for (const key of Object.keys(variant._zod.def.shape)) {
          if (key in values) activeValues[key] = values[key]
        }
      }
      const fields = activeFieldsFor(values)

      // Visibility is derived from the variant being validated (not the last
      // rendered one), with the current overrides, conditions and dynamic meta.
      const visibilityFields = toVisibilityFieldsRef.current(fields)
      const analyzed = analyzeVisibility(
        visibilityFields,
        values,
        isCustomRenderedRef.current,
      )
      const visibility = {
        ...analyzed,
        hidden: analyzed.hidden.filter((h) => !isStructural(h.path)),
      }
      // Hidden by `meta.hidden` in an array item config: covers rows a default
      // supplies that aren't in the input. Where input rows exist, their
      // observed visibility wins (per-row meta may reveal the field).
      const staticHidden = collectStaticHiddenSchemaPaths(
        visibilityFields,
        isCustomRenderedRef.current,
      ).filter(
        (path) => !visibility.rowOccurrences.get(path) && !isStructural(path),
      )
      const hiddenPaths = visibility.hidden.map((h) => h.path)
      // Map empty inputs first, on unpruned values (deferred-default
      // composites compare their raw value with their seed), without
      // consulting hidden fields' schemas
      const normalized = normalizeEmptyValues(
        activeValues,
        fields,
        new Set(hiddenPaths),
      )
      if (!hiddenPaths.length && !staticHidden.length) {
        return base(normalized, context, options)
      }

      const payload = omitPaths(normalized, hiddenPaths)
      // Hidden wherever it appears: swap the field's schema out entirely, so
      // its validators, transforms and defaults never run. Hidden in only some
      // array rows: the element schema is shared with visible rows, so
      // validate as-is, ignore those rows' errors, and re-parse with the field
      // optional if nothing else failed.
      const split = splitHidden(visibility)
      const everywhere = [...new Set([...split.everywhere, ...staticHidden])]
      const { someRows } = split
      const target = schemaFor('skip', schema, everywhere)
      // Zod may recreate hidden keys (e.g. from defaults): drop them from the
      // output. Fields hidden everywhere are dropped by key from every row;
      // per-row ones by row index, unless a transform may have moved rows.
      const someRowPaths = new Set(someRows)
      const indexedOutputPaths = visibility.hidden
        .filter(
          (h) =>
            someRowPaths.has(h.schemaPath) &&
            rowIndicesStable(schema, h.schemaPath),
        )
        .map((h) => h.path)
      type Result = Awaited<ReturnType<Resolver>>
      const prune = (result: Result): Result => {
        if (Object.keys(result.errors).length) return result
        let output = result.values as Record<string, unknown>
        for (const path of everywhere) output = omitSchemaPath(output, path)
        return {
          ...result,
          values: omitPaths(output, indexedOutputPaths),
        } as Result
      }

      const result = await validate(target)(payload, context, options)
      if (!Object.keys(result.errors).length) return prune(result)
      const visibleErrors = omitErrorsAt(result.errors, hiddenPaths)
      if (Object.keys(visibleErrors).length) {
        return { values: {}, errors: visibleErrors } as Result
      }
      if (!someRows.length) return result
      const relaxed = schemaFor('relax', target, someRows)
      return prune(await validate(relaxed)(payload, context, options))
    }
  }, [schema, unionInfo, activeFieldsFor, isCustomRenderedRef, isStructural])

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
  const [dynamicMeta, setDynamicMetaState] = React.useState<
    Record<string, Partial<FieldDependencyResult>>
  >({})
  // Synchronous snapshot for the resolver: a handler may call setFieldMeta (or
  // reset) and submit before React commits the state update
  const dynamicMetaRef = React.useRef(dynamicMeta)
  const setDynamicMeta = React.useCallback(
    (
      action: React.SetStateAction<
        Record<string, Partial<FieldDependencyResult>>
      >,
    ) => {
      const next =
        typeof action === 'function' ? action(dynamicMetaRef.current) : action
      dynamicMetaRef.current = next
      setDynamicMetaState(next)
      syncHiddenRef.current()
    },
    [],
  )
  const [arrayRegistry] = React.useState(createArrayRegistry)

  // ---------------------------------------------------------------------------
  // Reset-on-hide. A field that becomes hidden is reset to its default (and its
  // errors cleared), so it shows its default when it appears again — alike for
  // conditions, `hidden` (fields prop or setFieldMeta), objects and arrays.
  //
  // `syncHidden` runs synchronously from the events that can hide a field —
  // value changes (RHF `watch`), dynamic meta changes (`setDynamicMeta`), prop
  // changes (layout effect below) — and always reads live values, so it never
  // compares against a stale render.
  // ---------------------------------------------------------------------------
  const previousHiddenRef = React.useRef<Set<string> | null>(null)
  const syncSuspendedRef = React.useRef(0)
  const syncHidden = () => {
    if (syncSuspendedRef.current) return
    const values = getValues() as Record<string, unknown>
    const hidden = collectHiddenFields(
      toVisibilityFieldsRef.current(activeFieldsFor(values)),
      values,
      isCustomRenderedRef.current,
    ).filter((h) => !isStructural(h.path))
    const previous = previousHiddenRef.current
    // Updated before any setValue below, so re-entrant calls see no change
    previousHiddenRef.current = new Set(hidden.map((h) => h.path))
    if (!previous) return // fields hidden at first sync already hold defaults
    for (const { path, schemaPath, field } of hidden) {
      if (previous.has(path)) continue
      // Array rows move, so their initial defaults can't be looked up by index:
      // use the field's own default there
      const stored =
        path === schemaPath
          ? getAtPath(control._defaultValues, path)
          : undefined
      const fallback = stored === undefined ? getDefaultValue(field) : stored
      setValue(path, cloneValue(fallback), {
        shouldDirty: false,
        shouldValidate: false,
      })
      clearErrors(path)
    }
  }
  const syncHiddenRef = React.useRef(syncHidden)
  syncHiddenRef.current = syncHidden

  // Runs an array row operation as one step: per-row state (dynamic meta and
  // the hidden-field set) is reindexed alongside the values before syncing,
  // so a moved row's hidden field isn't mistaken for a newly hidden one.
  const runRowMutation = React.useCallback(
    (
      name: string,
      mutations: MutationType | MutationType[],
      run: () => void,
    ) => {
      const list = Array.isArray(mutations) ? mutations : [mutations]
      const reindexAll = <T,>(record: Record<string, T>) =>
        list.reduce(
          (acc, mutation) =>
            reindexDynamicMeta(
              acc as Record<string, Partial<FieldDependencyResult>>,
              name,
              mutation,
            ) as Record<string, T>,
          record,
        )
      syncSuspendedRef.current++
      try {
        run()
        const previous = previousHiddenRef.current
        if (previous) {
          const asRecord = Object.fromEntries([...previous].map((p) => [p, {}]))
          previousHiddenRef.current = new Set(Object.keys(reindexAll(asRecord)))
        }
        setDynamicMeta((prev) => reindexAll(prev))
      } finally {
        syncSuspendedRef.current--
      }
      syncHiddenRef.current()
    },
    [setDynamicMeta],
  )

  // Value changes, including those not caused by a field (setValue, reset,
  // array operations), arrive through RHF's subscription
  React.useEffect(() => {
    syncHiddenRef.current() // baseline
    const subscription = watch(() => syncHiddenRef.current())
    return () => subscription.unsubscribe()
  }, [watch])

  const onSubmitRef = useLatestRef(onSubmit)
  const onValuesChangeRef = useLatestRef(onValuesChange)
  const generatedDefaultsRef = useLatestRef(generatedDefaults)

  // Load async defaultValues once on mount
  React.useEffect(() => {
    if (!isAsyncDefaults) return
    let cancelled = false
    void (defaultValues as () => Promise<DeepPartial<z.infer<TSchema>>>)().then(
      (vals) => {
        if (cancelled) return
        rhf.reset(
          mergeDefaults(
            generatedDefaultsRef.current,
            vals as Record<string, unknown>,
          ),
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
      setValue: (name, value) =>
        setValue(name as string, value, {
          shouldValidate: true,
          shouldDirty: true,
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
      setDynamicMeta,
      clearErrors,
      getValues,
      handleSubmit,
      reset,
      resetField,
      setValue,
      setError,
      setFocus,
      watch,
      onSubmitRef,
    ],
  )

  React.useImperativeHandle(ref, () => formMethods, [formMethods])

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
    [setDynamicMeta],
  )

  // Build the UniForm context — stable when formMethods and setFieldMeta are stable
  const uniFormCtx = React.useMemo<UniFormContext<TSchema>>(
    () => ({ ...formMethods, setFieldMeta }),
    [formMethods, setFieldMeta],
  )

  // Everything that decides visibility (overrides, conditions, dynamic meta).
  // Validation builds on the same function (see `toVisibilityFieldsRef`).
  const visibilityFields = React.useMemo(
    () =>
      buildVisibilityFields(
        activeFields,
        fieldOverridesProp as Record<string, Partial<FieldMeta>>,
        (uniForm as UniForm<TSchema>)._getConditions() as Map<
          string,
          FieldCondition
        >,
        dynamicMeta,
      ),
    [activeFields, fieldOverridesProp, uniForm, dynamicMeta],
  )

  // Inject UniForm handlers into field.meta.onChange so they fire as real
  // event handlers (doesn't affect visibility)
  const fieldsWithDynamic = React.useMemo(
    () =>
      injectOnChangeHandlers(
        visibilityFields,
        uniForm as UniForm<TSchema>,
        uniFormCtx,
      ),
    [visibilityFields, uniForm, uniFormCtx],
  )

  const allValues = useWatch({ control })

  React.useLayoutEffect(() => {
    // Same pipeline as `visibilityFields`, but for any variant's fields and
    // with the synchronous dynamic-meta snapshot
    toVisibilityFieldsRef.current = (fields) =>
      buildVisibilityFields(
        fields,
        fieldOverridesProp as Record<string, Partial<FieldMeta>>,
        (uniForm as UniForm<TSchema>)._getConditions() as Map<
          string,
          FieldCondition
        >,
        dynamicMetaRef.current,
      )
    // A `fields`-prop or condition change can hide fields too
    syncHiddenRef.current()
  }, [fieldOverridesProp, uniForm])

  React.useEffect(() => {
    onValuesChangeRef.current?.(allValues as z.infer<TSchema>)
  }, [onValuesChangeRef, allValues])

  const visibleFields = useConditionalFields(fieldsWithDynamic, control)
  const sections = useSectionGrouping(visibleFields)

  const resolvedLayout = React.useMemo((): ResolvedLayoutSlots => {
    const base = resolveNullableSlot(
      layout?.arrayButtons?.base,
      DefaultArrayButton,
    )
    const slots = layout?.arrayButtons
    return {
      formWrapper: layout?.formWrapper ?? DefaultFormWrapper,
      sectionWrapper: layout?.sectionWrapper ?? DefaultSectionWrapper,
      submitButton: resolveNullableSlot(
        layout?.submitButton,
        DefaultSubmitButton,
      ),
      arrayRowLayout: layout?.arrayRowLayout ?? DefaultArrayRowLayout,
      arrayFieldLayout: layout?.arrayFieldLayout ?? DefaultArrayFieldLayout,
      objectWrapper: layout?.objectWrapper ?? DefaultObjectWrapper,
      arrayWrapper: layout?.arrayWrapper ?? DefaultArrayWrapper,
      arrayButtons: {
        base,
        add: resolveNullableSlot(slots?.add, base),
        remove: resolveNullableSlot(slots?.remove, base),
        moveUp: resolveNullableSlot(slots?.moveUp, base),
        moveDown: resolveNullableSlot(slots?.moveDown, base),
        duplicate: resolveNullableSlot(slots?.duplicate, base),
        collapse: resolveNullableSlot(
          slots?.collapse,
          DefaultArrayCollapseButton,
        ),
      },
      loadingFallback: layout?.loadingFallback ?? <p>Loading…</p>,
    }
  }, [
    layout?.formWrapper,
    layout?.sectionWrapper,
    layout?.submitButton,
    layout?.arrayRowLayout,
    layout?.arrayFieldLayout,
    layout?.objectWrapper,
    layout?.arrayWrapper,
    layout?.arrayButtons,
    layout?.loadingFallback,
  ])

  const resolvedFieldWrapper = fieldWrapper ?? DefaultFieldWrapper

  const FormWrapper = resolvedLayout.formWrapper
  const SectionWrapper = resolvedLayout.sectionWrapper
  const SubmitButton = resolvedLayout.submitButton

  const contextValue = React.useMemo(
    () => ({
      registry,
      fieldConfigs: mergedFields,
      fieldOverrides: fieldOverridesProp,
      fieldWrapper: resolvedFieldWrapper,
      layout: resolvedLayout,
      classNames,
      disabled,
      coercions,
      messages,
      labels,
      formMethods: formMethods as unknown as FormMethods,
      control,
      setDynamicMeta,
      arrayRegistry,
      runRowMutation,
    }),
    [
      registry,
      mergedFields,
      fieldOverridesProp,
      resolvedFieldWrapper,
      resolvedLayout,
      classNames,
      disabled,
      coercions,
      messages,
      labels,
      formMethods,
      control,
      setDynamicMeta,
      arrayRegistry,
      runRowMutation,
    ],
  )

  // While async defaultValues are still loading, render the fallback
  if (isLoadingDefaults) {
    return <>{resolvedLayout.loadingFallback}</>
  }

  return (
    <AutoFormContextProvider value={contextValue}>
      <form
        noValidate
        className={classNames.form}
        onSubmit={(e) => {
          void handleSubmit(async (values) => {
            await onSubmit(values as z.infer<TSchema>)
            clearPersistedData()
          })(e)
        }}
      >
        <FormWrapper>
          {sections.map((section) => {
            const renderedFields = section.fields.map((field, idx) => (
              <FieldRenderer
                key={field.name}
                field={field}
                control={control}
                index={idx}
                depth={0}
              />
            ))

            if (section.title === null) {
              return (
                <React.Fragment key='__ungrouped'>
                  {renderedFields}
                </React.Fragment>
              )
            }

            const sectionConfig = layout?.sections?.[section.title]
            const PerSectionWrapper = sectionConfig?.component ?? SectionWrapper

            return (
              <PerSectionWrapper
                key={section.title}
                title={section.title}
                className={sectionConfig?.className}
              >
                {renderedFields}
              </PerSectionWrapper>
            )
          })}
          {SubmitButton ? (
            <SubmitButton
              isSubmitting={formState.isSubmitting}
              label={labels.submit ?? 'Submit'}
            />
          ) : null}
        </FormWrapper>
      </form>
    </AutoFormContextProvider>
  )
}

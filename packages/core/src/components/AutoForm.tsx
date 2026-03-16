import * as React from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type * as z from 'zod/v4/core'
import type {
  AutoFormProps,
  AutoFormHandle,
  FieldCondition,
  FieldMeta,
  FormMethods,
  FieldDependencyResult,
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
import { AutoFormContextProvider } from '../context/AutoFormContext'
import { FieldRenderer } from './FieldRenderer'
import { useConditionalFields } from '../hooks/useConditionalFields'
import { useSectionGrouping } from '../hooks/useSectionGrouping'
import { useFormPersistence } from '../hooks/useFormPersistence'
import { useLatestRef } from '../hooks/useLatestRef'
import {
  applyFieldOverrides,
  injectOnChangeHandlers,
  injectConditions,
  applyDynamicMeta,
  buildDefaults,
} from '../utils/fieldPipeline'

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

  const rhf = useForm({
    resolver: zodResolver(schema) as unknown as Resolver,
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

  const onSubmitRef = useLatestRef(onSubmit)
  const onValuesChangeRef = useLatestRef(onValuesChange)
  const generatedDefaultsRef = useLatestRef(generatedDefaults)

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

  React.useImperativeHandle(
    ref,
    () => ({ ...formMethods, isSubmitting: formState.isSubmitting }),
    [formMethods, formState.isSubmitting],
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

  // Apply event-driven dynamic meta overrides (from setFieldMeta calls)
  const fieldsWithDynamic = React.useMemo(
    () => applyDynamicMeta(fieldsWithConditions, dynamicMeta),
    [fieldsWithConditions, dynamicMeta],
  )

  const allValues = useWatch({ control })

  React.useEffect(() => {
    onValuesChangeRef.current?.(allValues as z.infer<TSchema>)
  }, [onValuesChangeRef, allValues])

  const visibleFields = useConditionalFields(fieldsWithDynamic, control)
  const sections = useSectionGrouping(visibleFields)

  const resolvedLayout = React.useMemo(
    () => ({
      formWrapper: layout?.formWrapper ?? DefaultFormWrapper,
      sectionWrapper: layout?.sectionWrapper ?? DefaultSectionWrapper,
      submitButton: layout?.submitButton ?? DefaultSubmitButton,
      arrayRowLayout: layout?.arrayRowLayout ?? DefaultArrayRowLayout,
      loadingFallback: layout?.loadingFallback ?? <p>Loading…</p>,
    }),
    [
      layout?.formWrapper,
      layout?.sectionWrapper,
      layout?.submitButton,
      layout?.arrayRowLayout,
      layout?.loadingFallback,
    ],
  )

  const resolvedFieldWrapper = fieldWrapper ?? DefaultFieldWrapper

  const FormWrapper = resolvedLayout.formWrapper
  const SectionWrapper = resolvedLayout.sectionWrapper
  const SubmitButton = resolvedLayout.submitButton

  const contextValue = React.useMemo(
    () => ({
      registry,
      fieldOverrides: fieldOverridesProp,
      fieldWrapper: resolvedFieldWrapper,
      layout: resolvedLayout,
      classNames,
      disabled,
      coercions,
      messages,
      labels,
      formMethods: formMethods as unknown as FormMethods,
    }),
    [
      registry,
      fieldOverridesProp,
      resolvedFieldWrapper,
      resolvedLayout,
      classNames,
      disabled,
      coercions,
      messages,
      labels,
      formMethods,
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

            return (
              <SectionWrapper key={section.title} title={section.title}>
                {renderedFields}
              </SectionWrapper>
            )
          })}
          <SubmitButton
            isSubmitting={formState.isSubmitting}
            label={labels.submit ?? 'Submit'}
          />
        </FormWrapper>
      </form>
    </AutoFormContextProvider>
  )
}

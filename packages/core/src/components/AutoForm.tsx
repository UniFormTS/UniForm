import * as React from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type * as z from 'zod/v4/core'
import type {
  AutoFormProps,
  AutoFormHandle,
  FieldConfig,
  FieldCondition,
  FieldMeta,
  FormMethods,
  FieldDependencyResult,
} from '../types'
import type { UniForm, UniFormContext } from '../UniForm'
import { introspectObjectSchema } from '../introspection/introspect'
import { mergeRegistries } from '../registry/mergeRegistries'
import { defaultRegistry } from '../registry/defaultRegistry'
import { DefaultFieldWrapper } from './defaults/DefaultFieldWrapper'
import { DefaultSubmitButton } from './defaults/DefaultSubmitButton'
import { AutoFormContextProvider } from '../context/AutoFormContext'
import { FieldRenderer } from './FieldRenderer'
import { useConditionalFields } from '../hooks/useConditionalFields'
import { useSectionGrouping } from '../hooks/useSectionGrouping'
import { useFormPersistence } from '../hooks/useFormPersistence'
import { useLatestRef } from '../hooks/useLatestRef'

type WithChildrenAndTitle = React.PropsWithChildren & { title: string }

function DefaultFormWrapper({ children }: React.PropsWithChildren) {
  return <>{children}</>
}

function DefaultSectionWrapper({ children, title }: WithChildrenAndTitle) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

function DefaultArrayRowLayout({
  children,
  buttons,
}: {
  children: React.ReactNode
  buttons: {
    moveUp: React.ReactNode | null
    moveDown: React.ReactNode | null
    duplicate: React.ReactNode | null
    remove: React.ReactNode
    collapse: React.ReactNode | null
  }
  index: number
  rowCount: number
}) {
  return (
    <div>
      {buttons.collapse}
      {children}
      <div>
        {buttons.moveUp}
        {buttons.moveDown}
        {buttons.duplicate}
        {buttons.remove}
      </div>
    </div>
  )
}

/**
 * Recursively merges `overrides` (keyed by field name) into the `fields` tree,
 * applying each override to the matching field's `meta`. Descends into
 * `children` (object fields) and `itemConfig.children` (array-of-object fields).
 *
 * For array fields, keys prefixed with `"<arrayFieldName>."` are stripped before
 * matching against item children, so `"items.qty"` targets every row's `qty` field.
 */
function applyFieldOverrides(
  fields: FieldConfig[],
  overrides: Record<string, Partial<FieldConfig['meta']>>,
): FieldConfig[] {
  return fields.map((field) => {
    const override = overrides[field.name]
    const updated = override
      ? { ...field, meta: { ...field.meta, ...override } }
      : field

    // Recurse into object children
    if (updated.type === 'object') {
      const newChildren = applyFieldOverrides(updated.children, overrides)
      if (newChildren !== updated.children) {
        return { ...updated, children: newChildren }
      }
    }

    // Recurse into array itemConfig (if it has children).
    // Re-key overrides by stripping the "<arrayField>." prefix so that
    // e.g. "items.qty" matches the child field named "qty".
    if (updated.type === 'array' && updated.itemConfig.type === 'object') {
      const prefix = `${updated.name}.`
      const strippedOverrides: Record<string, Partial<FieldConfig['meta']>> = {}
      for (const [key, value] of Object.entries(overrides)) {
        if (key.startsWith(prefix)) {
          strippedOverrides[key.slice(prefix.length)] = value
        }
      }
      const newItemChildren = applyFieldOverrides(
        updated.itemConfig.children,
        strippedOverrides,
      )
      if (newItemChildren !== updated.itemConfig.children) {
        return {
          ...updated,
          itemConfig: { ...updated.itemConfig, children: newItemChildren },
        }
      }
    }

    return updated
  })
}

/**
 * Injects UniForm onChange handlers into each watched field's `meta.onChange`.
 * Composes with any existing static `meta.onChange` from the `fields` prop.
 */
function injectOnChangeHandlers<TSchema extends z.$ZodObject>(
  fields: FieldConfig[],
  uniForm: UniForm<TSchema>,
  ctx: UniFormContext<TSchema>,
): FieldConfig[] {
  const watched = new Set(uniForm._getWatchedFields())
  if (!watched.size) return fields

  return fields.map((field) => {
    if (!watched.has(field.name)) return field
    const existingOnChange = field.meta.onChange
    return {
      ...field,
      meta: {
        ...field.meta,
        onChange: (value: unknown, formMethods: FormMethods) => {
          existingOnChange?.(value, formMethods)
          uniForm._fireHandlers(field.name, value, ctx)
        },
      },
    }
  })
}

/**
 * Injects UniForm conditions into each field's `meta.condition`.
 * UniForm conditions take precedence over any static `condition` from the `fields` prop.
 */
function injectConditions<TSchema extends z.$ZodObject>(
  fields: FieldConfig[],
  uniForm: UniForm<TSchema>,
): FieldConfig[] {
  const conditions = uniForm._getConditions()
  if (!conditions.size) return fields

  return fields.map((field) => {
    const condition = conditions.get(field.name)
    if (!condition) return field
    return {
      ...field,
      meta: {
        ...field.meta,
        condition: condition as FieldCondition,
      },
    }
  })
}

/**
 * Merges event-driven `dynamicMeta` overrides into the field configs.
 * Only fields with entries in `overrides` are cloned.
 */
function applyDynamicMeta(
  fields: FieldConfig[],
  overrides: Record<string, Partial<FieldDependencyResult>>,
): FieldConfig[] {
  if (!Object.keys(overrides).length) return fields
  return fields.map((field) => {
    const override = overrides[field.name]
    if (!override) return field
    const { options, label, ...metaOverrides } = override
    return {
      ...field,
      ...(label !== undefined ? { label } : {}),
      ...(options !== undefined ? { options } : {}),
      meta: { ...field.meta, ...metaOverrides },
    }
  })
}

/** Generate sensible empty defaults so RHF starts with '' instead of undefined */
function buildDefaults(fields: FieldConfig[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    const key = field.name
    switch (field.type) {
      case 'string':
        result[key] = ''
        break
      case 'number':
        result[key] = ''
        break
      case 'boolean':
        result[key] = false
        break
      case 'select':
        result[key] = field.options?.[0]?.value ?? ''
        break
      case 'array':
        result[key] = []
        break
      case 'object':
        // Recurse — but children have full dot-notated names; just use empty object
        result[key] = {}
        break
      default:
        break
    }
  }
  return result
}

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

  const rawFields = React.useMemo(
    () => introspectObjectSchema(schema),
    [schema],
  )

  const registry = React.useMemo(
    () => mergeRegistries(defaultRegistry, components),
    [components],
  )

  const mergedFields = React.useMemo(
    () =>
      applyFieldOverrides(
        rawFields,
        fieldOverridesProp as Record<string, Partial<FieldMeta>>,
      ),
    [rawFields, fieldOverridesProp],
  )

  const generatedDefaults = React.useMemo(
    () => buildDefaults(rawFields),
    [rawFields],
  )

  const computedDefaults = React.useMemo(
    () => ({
      ...generatedDefaults,
      ...(defaultValues as Record<string, unknown>),
    }),
    [generatedDefaults, defaultValues],
  )

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
  } = rhf

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
    () => injectConditions(fieldsWithHandlers, uniForm as UniForm<TSchema>),
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

  const resolvedLayout = {
    formWrapper: layout?.formWrapper ?? DefaultFormWrapper,
    sectionWrapper: layout?.sectionWrapper ?? DefaultSectionWrapper,
    submitButton: layout?.submitButton ?? DefaultSubmitButton,
    arrayRowLayout: layout?.arrayRowLayout ?? DefaultArrayRowLayout,
  }

  const resolvedFieldWrapper = fieldWrapper ?? DefaultFieldWrapper

  const FormWrapper = resolvedLayout.formWrapper
  const SectionWrapper = resolvedLayout.sectionWrapper
  const SubmitButton = resolvedLayout.submitButton

  return (
    <AutoFormContextProvider
      value={{
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
      }}
    >
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
          <SubmitButton isSubmitting={formState.isSubmitting} />
        </FormWrapper>
      </form>
    </AutoFormContextProvider>
  )
}

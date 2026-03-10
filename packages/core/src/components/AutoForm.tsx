import * as React from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type * as z from 'zod/v4'
import type {
  AutoFormProps,
  AutoFormHandle,
  FieldConfig,
  FieldMeta,
} from '../types'
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
import { useFieldDependencies } from '../hooks/useFieldDependencies'

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
 * Supports: conditional fields, field dependencies, section grouping, form
 * persistence, imperative handle via `ref`, and full layout/component
 * customisation.
 *
 * @template TSchema - A `ZodObject` schema that defines the form shape.
 *
 * @example
 * <AutoForm
 *   schema={z.object({ name: z.string(), age: z.number() })}
 *   onSubmit={(values) => console.log(values)}
 * />
 */
export function AutoForm<TSchema extends z.ZodObject<z.ZodRawShape>>(
  props: AutoFormProps<TSchema> & {
    ref?: React.Ref<AutoFormHandle<z.infer<TSchema>>>
  },
) {
  const {
    schema,
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

  const { control, handleSubmit, formState } = rhf

  const { clearPersistedData } = useFormPersistence({
    control,
    key: persistKey,
    debounceMs: persistDebounce,
    storage: persistStorage,
    reset: rhf.reset as (values: Record<string, unknown>) => void,
    defaultValues: computedDefaults,
  })

  React.useImperativeHandle(ref, () => ({
    reset: (values) => {
      if (values) {
        rhf.reset({ ...rhf.getValues(), ...values } as Record<string, unknown>)
      } else {
        rhf.reset()
      }
    },
    submit: () => {
      void handleSubmit((values) => onSubmit(values as z.infer<TSchema>))()
    },
    setValues: (values) => {
      for (const [key, val] of Object.entries(
        values as Record<string, unknown>,
      )) {
        rhf.setValue(key, val, { shouldValidate: true, shouldDirty: true })
      }
    },
    getValues: () => rhf.getValues() as z.infer<TSchema>,
    setErrors: (errors) => {
      for (const [key, message] of Object.entries(errors)) {
        rhf.setError(key, { type: 'manual', message })
      }
    },
    clearErrors: (fieldNames) => {
      if (fieldNames) {
        rhf.clearErrors(fieldNames)
      } else {
        rhf.clearErrors()
      }
    },
    focus: (fieldName) => {
      rhf.setFocus(fieldName)
    },
  }))

  const allValues = useWatch({ control })
  const onValuesChangeRef = React.useRef(onValuesChange)

  React.useEffect(() => {
    onValuesChangeRef.current = onValuesChange
  }, [onValuesChange])

  React.useEffect(() => {
    onValuesChangeRef.current?.(allValues as z.infer<TSchema>)
  }, [allValues])

  const fieldsWithDeps = useFieldDependencies(
    mergedFields,
    control,
    (name, value, opts) => rhf.setValue(name, value as never, opts),
  )
  const visibleFields = useConditionalFields(fieldsWithDeps, control)
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

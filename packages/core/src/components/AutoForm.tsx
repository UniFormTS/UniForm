import * as React from 'react'
import type * as z from 'zod/v4/core'
import type {
  AutoFormProps,
  AutoFormHandle,
  AutoFormInstanceProps,
  AutoFormOwnStateProps,
  FieldMeta,
} from '../types'
import {
  useUniForm,
  isUniFormInstance,
  type UniFormInstance,
} from '../hooks/useUniForm'
import type { AutoFormContextValue } from '../context/AutoFormContext'
import { applyFieldOverrides } from '../utils/fieldPipeline'
import { resolveLayoutSlots } from '../utils/resolveLayoutSlots'
import { mergeRegistries } from '../registry/mergeRegistries'
import { UniFormProvider } from './UniFormProvider'
import { AutoFormRenderer } from './AutoFormRenderer'

type WithRef<TSchema extends z.$ZodObject, TProps> = TProps & {
  ref?: React.Ref<AutoFormHandle<TSchema>>
}

type AutoFormComponentProps<TSchema extends z.$ZodObject> = WithRef<
  TSchema,
  AutoFormProps<TSchema>
>

/**
 * The core auto-form component. Introspects the provided Zod `schema`,
 * renders the appropriate field components, validates on submit using
 * `zodResolver`, and calls `onSubmit` with the fully-typed, validated values.
 *
 * Supports: conditional fields, dynamic field meta via UniForm onChange
 * handlers, section grouping, form persistence, imperative handle via `ref`,
 * and full layout/component customisation.
 *
 * `form` accepts either a `createForm(schema)` definition — in which case
 * `<AutoForm>` owns the store — or a {@link useUniForm} result, in which case
 * it renders into the store you already created. It never creates a second one.
 *
 * @template TSchema - A `ZodObject` schema that defines the form shape.
 *
 * @example
 * const myForm = createForm(z.object({ name: z.string(), age: z.number() }))
 *
 * <AutoForm form={myForm} onSubmit={(values) => console.log(values)} />
 *
 * @example
 * // Headless: the app owns the page, UniForm owns the store.
 * const form = useUniForm(myForm, { defaultValues })
 *
 * <PageChrome onSave={form.submit}>
 *   <AutoForm form={form} />
 * </PageChrome>
 */
export function AutoForm<TSchema extends z.$ZodObject>(
  props: AutoFormComponentProps<TSchema>,
) {
  // Two sibling components — never a conditional hook call.
  return isUniFormInstance(props.form) ? (
    <AutoFormWithInstance
      {...(props as WithRef<TSchema, AutoFormInstanceProps<TSchema>>)}
    />
  ) : (
    <AutoFormWithOwnState
      {...(props as WithRef<TSchema, AutoFormOwnStateProps<TSchema>>)}
    />
  )
}

/** `<AutoForm form={createForm(schema)}>` — AutoForm owns the store. */
function AutoFormWithOwnState<TSchema extends z.$ZodObject>(
  props: WithRef<TSchema, AutoFormOwnStateProps<TSchema>>,
) {
  const { form, onSubmit, ref, ...options } = props
  const instance = useUniForm(form, { ...options, onSubmit })

  React.useImperativeHandle(ref, () => instance.methods, [instance.methods])

  if (instance.isLoading) return <>{instance._loadingFallback}</>

  return (
    <UniFormProvider form={instance}>
      <AutoFormRenderer
        onSubmit={instance.submit}
        isSubmitting={instance.isSubmitting}
      />
    </UniFormProvider>
  )
}

/** `<AutoForm form={useUniForm(...)}>` — renders into the provided store. */
function AutoFormWithInstance<TSchema extends z.$ZodObject>(
  props: WithRef<TSchema, AutoFormInstanceProps<TSchema>>,
) {
  const {
    form: instance,
    onSubmit,
    ref,
    fields,
    layout,
    classNames,
    fieldWrapper,
    components,
    disabled,
    labels,
    messages,
    coercions,
  } = props

  // `<AutoForm onSubmit>` wins over the handler given to useUniForm while this
  // form is mounted, so an external submit button and the rendered one agree.
  const onSubmitRef = instance._onSubmitRef
  React.useLayoutEffect(() => {
    if (!onSubmit) return
    onSubmitRef.current = onSubmit
    return () => {
      if (onSubmitRef.current === onSubmit) onSubmitRef.current = undefined
    }
  }, [onSubmitRef, onSubmit])

  React.useImperativeHandle(ref, () => instance.methods, [instance.methods])

  const base = instance._context
  const runPipeline = instance._runPipeline
  const context = React.useMemo<AutoFormContextValue<z.infer<TSchema>>>(() => {
    // Overrides go in *beneath* UniForm's handlers, conditions and dynamic
    // meta, exactly as they would on useUniForm itself.
    const fieldConfigs = fields
      ? applyFieldOverrides(
          base.fieldConfigs,
          fields as Record<string, Partial<FieldMeta>>,
        )
      : base.fieldConfigs
    const internals = {
      ...base._internal,
      ...(fields
        ? {
            resolvedFields: runPipeline(fieldConfigs),
            fieldOverrides: { ...base._internal.fieldOverrides, ...fields },
          }
        : {}),
      ...(layout
        ? { layoutSlots: { ...base._internal.layoutSlots, ...layout } }
        : {}),
    }

    return {
      ...base,
      ...internals,
      fieldConfigs,
      _internal: internals,
      ...(layout
        ? {
            layout: resolveLayoutSlots({
              ...base._internal.layoutSlots,
              ...layout,
            }),
          }
        : {}),
      ...(classNames
        ? { classNames: { ...base.classNames, ...classNames } }
        : {}),
      ...(fieldWrapper ? { fieldWrapper } : {}),
      ...(components
        ? { registry: mergeRegistries(base.registry, components) }
        : {}),
      ...(disabled !== undefined
        ? { disabled: disabled || base.disabled }
        : {}),
      ...(labels ? { labels: { ...base.labels, ...labels } } : {}),
      ...(messages ? { messages: { ...base.messages, ...messages } } : {}),
      ...(coercions ? { coercions: { ...base.coercions, ...coercions } } : {}),
    }
  }, [
    base,
    runPipeline,
    fields,
    layout,
    classNames,
    fieldWrapper,
    components,
    disabled,
    labels,
    messages,
    coercions,
  ])

  const scoped = React.useMemo(
    () => ({ ...instance, _context: context }) as UniFormInstance<TSchema>,
    [instance, context],
  )

  if (instance.isLoading) return <>{instance._loadingFallback}</>

  return (
    <UniFormProvider form={scoped}>
      <AutoFormRenderer
        onSubmit={instance.submit}
        isSubmitting={instance.isSubmitting}
      />
    </UniFormProvider>
  )
}

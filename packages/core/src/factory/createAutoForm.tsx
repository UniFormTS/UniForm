import * as React from 'react'
import type * as z from 'zod/v4'
import type { AutoFormConfig, AutoFormProps, AutoFormHandle } from '../types'
import { AutoForm } from '../components/AutoForm'
import { mergeRegistries } from '../registry/mergeRegistries'

/**
 * Factory that creates a pre-configured `<AutoForm>` component with a fixed
 * set of defaults baked in.
 *
 * All options passed to `createAutoForm` become the baseline for every form
 * instance produced by the returned component. Any prop passed directly to the
 * returned component is **deep-merged** on top of those defaults (instance
 * props win on conflicts).
 *
 * Merged items: `components`, `layout`, `classNames`, `coercions`, `messages`.
 * Replaced items: `fieldWrapper`, `disabled` (OR-ed with the factory default).
 *
 * @param config - Factory-level defaults applied to every form instance.
 * @returns A `<AutoForm>`-compatible component with the provided defaults applied.
 *
 * @example
 * const AutoForm = createAutoForm({
 *   components: { string: MyTextInput },
 *   classNames: { form: 'my-form' },
 * })
 *
 * // Later:
 * <AutoForm schema={mySchema} onSubmit={handleSubmit} />
 */
export function createAutoForm(config: AutoFormConfig) {
  function ConfiguredAutoForm<TSchema extends z.ZodObject<z.ZodRawShape>>(
    props: AutoFormProps<TSchema> & {
      ref?: React.Ref<AutoFormHandle<z.infer<TSchema>>>
    },
  ) {
    const mergedComponents = React.useMemo(
      () => mergeRegistries(config.components ?? {}, props.components),
      [props.components],
    )

    const mergedLayout = React.useMemo(
      () => ({ ...config.layout, ...props.layout }),
      [props.layout],
    )

    const mergedClassNames = React.useMemo(
      () => ({ ...config.classNames, ...props.classNames }),
      [props.classNames],
    )

    const mergedCoercions = React.useMemo(
      () =>
        props.coercions || config.coercions
          ? { ...config.coercions, ...props.coercions }
          : undefined,
      [props.coercions],
    )

    const mergedMessages = React.useMemo(
      () =>
        props.messages || config.messages
          ? { ...config.messages, ...props.messages }
          : undefined,
      [props.messages],
    )

    return (
      <AutoForm
        {...props}
        ref={props.ref}
        components={mergedComponents}
        fieldWrapper={props.fieldWrapper ?? config.fieldWrapper}
        layout={mergedLayout}
        classNames={mergedClassNames}
        disabled={props.disabled || config.disabled || false}
        coercions={mergedCoercions}
        messages={mergedMessages}
      />
    )
  }

  ConfiguredAutoForm.displayName = 'AutoForm(configured)'
  return ConfiguredAutoForm
}

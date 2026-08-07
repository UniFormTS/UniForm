import * as React from 'react'
import { useController } from 'react-hook-form'
import type { FieldConfig, FieldProps } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import { useFieldPath, joinFieldPath } from '../context/FieldPathContext'
import { resolveFieldAt } from '../utils/resolveFieldAt'
import { resolveErrorMessage } from '../utils/resolveErrorMessage'
import { coerceValue } from '../coercion/coerce'

export type UseFieldOptions = {
  /** Override the resolved label. */
  label?: string
  /** Force the field disabled regardless of schema/context. */
  disabled?: boolean
}

export type UseFieldResult<TValue = unknown> = FieldProps<TValue> & {
  /** The resolved field config, for components that need to inspect it. */
  config: FieldConfig
}

/**
 * Resolve the fully-wired props for a single leaf field at `name`, so an app
 * can render its own input while UniForm keeps registration, coercion,
 * validation and error resolution.
 *
 * This is the primitive behind `<Field>`. Paths are absolute by default, or
 * relative to the enclosing container (see `useFieldPath`).
 *
 * @example
 * function CityInput() {
 *   const { value, onChange, onBlur, ref, error, required } =
 *     useField<string>('address.city')
 *   return (
 *     <>
 *       <input ref={ref} value={value} onBlur={onBlur}
 *              onChange={(e) => onChange(e.target.value)}
 *              aria-required={required} />
 *       {error && <span role='alert'>{error}</span>}
 *     </>
 *   )
 * }
 */
export function useField<TValue = unknown>(
  name: string,
  options: UseFieldOptions = {},
): UseFieldResult<TValue> {
  const {
    control,
    resolvedFields,
    messages,
    coercions,
    disabled: contextDisabled,
    formMethods,
  } = useAutoFormContext()
  const basePath = useFieldPath()
  const path = joinFieldPath(basePath, name)

  const resolved = resolveFieldAt(resolvedFields, path)
  const config = resolved?.config

  React.useEffect(() => {
    if (config) return
    console.warn(
      `[UniForm] useField("${path}") found no field at that path in the schema. ` +
        'The input will still register with react-hook-form, but it has no ' +
        'label, validation metadata or registered component. Check the path spelling.',
    )
  }, [path, config])

  const { field: rhfField, fieldState } = useController({
    control,
    name: path as never,
  })

  const fieldType = config?.type ?? 'string'
  const error = resolveErrorMessage(path, fieldState.error, messages)

  const onChange = React.useCallback(
    (value: TValue) => {
      const coerced = coerceValue(fieldType, value, coercions)
      rhfField.onChange(coerced)
      void config?.meta.onChange?.(coerced, formMethods)
    },
    [fieldType, coercions, rhfField, config, formMethods],
  )

  const isComposite = fieldType === 'object' || fieldType === 'array'

  return {
    name: path,
    value: (isComposite
      ? (rhfField.value as unknown)
      : ((rhfField.value as unknown) ?? '')) as TValue,
    onChange,
    onBlur: rhfField.onBlur,
    ref: rhfField.ref,
    label: options.label ?? config?.label ?? '',
    placeholder: config?.meta.placeholder,
    description: config?.meta.description,
    error,
    required: config?.required ?? false,
    disabled: options.disabled ?? (config?.meta.disabled || contextDisabled),
    options: config?.type === 'select' ? config.options : config?.meta.options,
    meta: config?.meta ?? {},
    schema: config?.schema as FieldProps<TValue>['schema'],
    config: config as FieldConfig,
  }
}

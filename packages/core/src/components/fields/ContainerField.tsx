import * as React from 'react'
import { Controller, useFieldArray } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type {
  ArrayContainerProps,
  FieldConfig,
  ObjectContainerProps,
  SetValueOptions,
} from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { FieldPathProvider } from '../../context/FieldPathContext'
import { resolveComponent } from '../resolveComponent'

type ContainerFieldProps = {
  field: FieldConfig
  control: Control
  effectiveName: string
  shouldUnregister?: boolean
}

/**
 * Renders a custom component in place of an **object** field, giving it the
 * `ObjectContainerProps` superset and scoping relative `<Field>` paths to the
 * object's own path.
 */
export function ObjectContainerField({
  field,
  control,
  effectiveName,
  shouldUnregister,
}: ContainerFieldProps) {
  const { registry } = useAutoFormContext()
  const Component = resolveComponent(field, registry)
  const setPath = useSetPath(effectiveName)
  const base = useContainerBase(field, effectiveName)

  if (!Component) return null

  const Typed =
    Component as unknown as React.ComponentType<ObjectContainerProps>

  return (
    <FieldPathProvider value={effectiveName}>
      <Controller
        name={effectiveName}
        control={control}
        shouldUnregister={shouldUnregister}
        render={({ field: rhfField, fieldState }) => (
          <Typed
            {...base}
            value={rhfField.value as unknown}
            onChange={rhfField.onChange}
            onBlur={rhfField.onBlur}
            ref={rhfField.ref}
            error={fieldState.error?.message}
            path={effectiveName}
            setPath={setPath}
            fields={field.type === 'object' ? field.children : []}
          />
        )}
      />
    </FieldPathProvider>
  )
}

/**
 * Renders a custom component in place of an **array** field, giving it the
 * `ArrayContainerProps` superset — row operations included — and scoping
 * relative `<Field>` paths to the array's own path.
 */
export function ArrayContainerField({
  field,
  control,
  effectiveName,
  shouldUnregister,
}: ContainerFieldProps) {
  const { registry, _internal } = useAutoFormContext()
  const { arrayFields } = _internal
  const Component = resolveComponent(field, registry)
  const setPath = useSetPath(effectiveName)
  const base = useContainerBase(field, effectiveName)

  // A custom component still gets a *real* field array, so row operations keep
  // react-hook-form's row identity, error reindexing and leaf notifications.
  const {
    fields: rows,
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    update,
    replace,
  } = useFieldArray({ control, name: effectiveName })

  React.useEffect(
    () =>
      arrayFields.register(effectiveName, {
        fields: rows,
        append,
        prepend,
        insert,
        remove,
        move,
        swap,
        update,
        replace,
      }),
    [
      arrayFields,
      effectiveName,
      rows,
      append,
      prepend,
      insert,
      remove,
      move,
      swap,
      update,
      replace,
    ],
  )

  const minItems = field.type === 'array' ? field.minItems : undefined
  const maxItems = field.type === 'array' ? field.maxItems : undefined
  const rowCount = rows.length

  if (!Component) return null

  const Typed = Component as unknown as React.ComponentType<ArrayContainerProps>

  return (
    <FieldPathProvider value={effectiveName}>
      <Controller
        name={effectiveName}
        control={control}
        shouldUnregister={shouldUnregister}
        render={({ field: rhfField, fieldState }) => (
          <Typed
            {...base}
            value={rhfField.value as unknown}
            onChange={rhfField.onChange}
            onBlur={rhfField.onBlur}
            ref={rhfField.ref}
            error={fieldState.error?.message}
            path={effectiveName}
            setPath={setPath}
            itemConfig={
              field.type === 'array' ? field.itemConfig : (field as FieldConfig)
            }
            rows={rows as unknown as Record<string, unknown>[]}
            rowCount={rowCount}
            canAdd={maxItems == null || rowCount < maxItems}
            atMin={minItems != null && rowCount <= minItems}
            append={append}
            prepend={prepend}
            insert={insert}
            remove={remove}
            move={move}
            swap={swap}
            update={update}
            replace={replace}
          />
        )}
      />
    </FieldPathProvider>
  )
}

/** Targeted write at a path relative to the container. */
function useSetPath(effectiveName: string) {
  const { formMethods } = useAutoFormContext()
  return React.useCallback(
    (subPath: string, value: unknown, options?: SetValueOptions) => {
      const target = subPath ? `${effectiveName}.${subPath}` : effectiveName
      ;(
        formMethods.setValue as unknown as (
          name: string,
          value: unknown,
          options?: SetValueOptions,
        ) => void
      )(target, value, options)
    },
    [formMethods, effectiveName],
  )
}

/** The `FieldProps` half of the container props. */
function useContainerBase(field: FieldConfig, effectiveName: string) {
  const { disabled: contextDisabled } = useAutoFormContext()
  return {
    name: effectiveName,
    label: field.label,
    placeholder: field.meta.placeholder,
    description: field.meta.description,
    required: field.required,
    disabled: field.meta.disabled || contextDisabled,
    options: field.meta.options,
    meta: field.meta,
    schema: field.schema,
  }
}

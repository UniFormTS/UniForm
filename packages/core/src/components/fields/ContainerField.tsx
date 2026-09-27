import * as React from 'react'
import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type {
  ArrayContainerProps,
  ContainerFieldProps,
  FieldConfig,
  ObjectContainerProps,
  SetValueOptions,
} from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { FieldPathContext, useFieldTree } from '../../context/FieldTreeContext'
import { useRegisteredFieldArray } from '../../hooks/useRegisteredFieldArray'
import { useLatestRef } from '../../hooks/useLatestRef'
import { coerceValue } from '../../coercion/coerce'
import { resolveComponent } from '../resolveComponent'

type ObjectConfig = Extract<FieldConfig, { type: 'object' }>
type ArrayConfig = Extract<FieldConfig, { type: 'array' }>

type ContainerFieldRendererProps = {
  field: ObjectConfig | ArrayConfig
  control: Control
  effectiveName: string
  namePrefix?: string
  error?: string
  shouldUnregister?: boolean
}

const noop = () => {}

/** Base `ContainerFieldProps` shared by object and array containers. */
function useContainerProps({
  field,
  control,
  effectiveName,
  error,
  shouldUnregister,
}: ContainerFieldRendererProps) {
  const {
    registry,
    disabled: contextDisabled,
    coercions,
    formMethods,
  } = useAutoFormContext()
  const tree = useFieldTree()
  const value = useWatch({ control, name: effectiveName }) as unknown

  // Mirrors a conditional leaf's Controller: drop the value while hidden, but
  // not while a field array action is moving rows around.
  React.useEffect(() => {
    if (!shouldUnregister) return
    return () => {
      if (!control._state.action) control.unregister(effectiveName)
    }
  }, [control, effectiveName, shouldUnregister])

  const setPath = React.useCallback(
    (subPath: string, next: unknown, options?: SetValueOptions) =>
      tree.setValue(
        subPath ? `${effectiveName}.${subPath}` : effectiveName,
        next,
        options,
      ),
    [tree, effectiveName],
  )

  const latest = useLatestRef({ field, coercions, formMethods })
  // Coerces, writes via `write`, then fires the field's onChange handlers
  const change = React.useCallback(
    (next: unknown, write: (coerced: unknown) => void) => {
      const { field, coercions, formMethods } = latest.current
      const coerced = coerceValue(field.type, next, coercions)
      write(coerced)
      void field.meta.onChange?.(coerced, formMethods)
    },
    [latest],
  )

  const props: Omit<ContainerFieldProps, 'onChange'> = {
    name: effectiveName,
    path: effectiveName,
    value,
    onBlur: noop,
    ref: noop,
    label: field.label,
    placeholder: field.meta.placeholder,
    description: field.meta.description,
    error,
    required: field.required,
    disabled: field.meta.disabled || contextDisabled,
    options: field.meta.options,
    meta: field.meta,
    schema: field.schema,
    setPath,
  }

  return {
    props,
    Component: resolveComponent(field, registry),
    change,
  }
}

function ObjectContainer(
  props: ContainerFieldRendererProps & { field: ObjectConfig },
) {
  const { field, control, effectiveName, namePrefix } = props
  const { props: base, Component, change } = useContainerProps(props)
  const tree = useFieldTree()

  const fields = React.useMemo(
    () =>
      namePrefix
        ? field.children.map((child) => ({
            ...child,
            name: `${namePrefix}.${child.name}`,
          }))
        : field.children,
    [field.children, namePrefix],
  )

  const onChange = React.useCallback(
    (next: unknown) =>
      change(next, (coerced) =>
        // Validate like a Controller change: only once the form was submitted
        tree.setValue(effectiveName, coerced, {
          shouldValidate: control._formState.isSubmitted,
        }),
      ),
    [change, tree, effectiveName, control],
  )

  if (!Component) return null
  const Container = Component as React.ComponentType<ObjectContainerProps>

  return (
    <Container
      {...(base as Omit<ObjectContainerProps, 'onChange' | 'fields'>)}
      fields={fields}
      onChange={onChange}
    />
  )
}

function ArrayContainer(
  props: ContainerFieldRendererProps & { field: ArrayConfig },
) {
  const { field, effectiveName } = props
  const { props: base, Component, change } = useContainerProps(props)
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
    replaceKeepingMeta,
  } = useRegisteredFieldArray(effectiveName)

  const onChange = React.useCallback(
    (next: unknown[]) =>
      change(next, (coerced) =>
        replaceKeepingMeta(Array.isArray(coerced) ? coerced : []),
      ),
    [change, replaceKeepingMeta],
  )

  if (!Component) return null
  const Container = Component as React.ComponentType<ArrayContainerProps>
  const { minItems, maxItems } = field

  return (
    <Container
      {...(base as Omit<ArrayContainerProps, 'onChange'>)}
      onChange={onChange}
      itemConfig={field.itemConfig}
      rows={rows}
      rowCount={rows.length}
      canAdd={maxItems == null || rows.length < maxItems}
      atMin={minItems != null && rows.length <= minItems}
      append={append}
      prepend={prepend}
      insert={insert}
      remove={remove}
      move={move}
      swap={swap}
      update={update}
      replace={replace}
    />
  )
}

/**
 * Renders a component override set on an `object` / `array` field in place
 * of the field's subtree. `<Field>` names inside it resolve relative to it.
 */
export function ContainerField(props: ContainerFieldRendererProps) {
  const { field, effectiveName } = props
  return (
    <FieldPathContext.Provider value={effectiveName}>
      {field.type === 'array' ? (
        <ArrayContainer {...props} field={field} />
      ) : (
        <ObjectContainer {...props} field={field} />
      )}
    </FieldPathContext.Provider>
  )
}

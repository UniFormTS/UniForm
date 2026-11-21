import * as React from 'react'
import { useFieldArray } from 'react-hook-form'
import { useAutoFormContext } from '../context/AutoFormContext'
import type { ArrayOperations } from '../context/arrayRegistry'
import type { MutationType } from '../utils/reindexDynamicMeta'
import { useLatestRef } from './useLatestRef'
import { getAtPath } from '../utils/getAtPath'

const countOf = (value: unknown) => (Array.isArray(value) ? value.length : 1)

/**
 * Wraps array row operations so per-row state (dynamic meta overrides,
 * hidden-field tracking) follows its row. Shared by the mounted field array
 * and the `setValue` fallback used by `useArrayField`.
 */
export function withRowMetaReindex(
  ops: ArrayOperations,
  name: string,
  runRowMutation: (
    name: string,
    mutations: MutationType | MutationType[],
    run: () => void,
  ) => void,
): ArrayOperations {
  const mutate = (mutation: MutationType, run: () => void) =>
    runRowMutation(name, mutation, run)

  return {
    append: ops.append,
    update: ops.update,
    prepend: (value, options) =>
      mutate({ type: 'insert', index: 0, count: countOf(value) }, () =>
        ops.prepend(value, options),
      ),
    insert: (index, value, options) =>
      mutate({ type: 'insert', index, count: countOf(value) }, () =>
        ops.insert(index, value, options),
      ),
    remove: (index) => {
      if (index === undefined) {
        mutate({ type: 'clear' }, () => ops.remove(index))
        return
      }
      // One reindex per removed row, highest index first
      const indices = [...new Set(Array.isArray(index) ? index : [index])]
      runRowMutation(
        name,
        indices
          .sort((a, b) => b - a)
          .map((i): MutationType => ({ type: 'remove', index: i })),
        () => ops.remove(index),
      )
    },
    move: (from, to) =>
      mutate({ type: 'move', from, to }, () => ops.move(from, to)),
    swap: (a, b) => mutate({ type: 'swap', a, b }, () => ops.swap(a, b)),
    replace: (value) => mutate({ type: 'clear' }, () => ops.replace(value)),
  }
}

/**
 * Mounts the field array at `name`, wraps its operations so row overrides
 * follow their rows, and publishes them to the form's array registry so
 * `useArrayField(name)` drives this instance. Used by every component that
 * renders an array's rows.
 */
export function useRegisteredFieldArray(name: string) {
  const { control, formMethods, runRowMutation, arrayRegistry } =
    useAutoFormContext()
  const fieldArray = useFieldArray({ control, name })
  const latest = useLatestRef(fieldArray)

  const ops = React.useMemo(
    () =>
      withRowMetaReindex(
        {
          append: (value, options) => latest.current.append(value, options),
          prepend: (value, options) => latest.current.prepend(value, options),
          insert: (index, value, options) =>
            latest.current.insert(index, value, options),
          remove: (index) => latest.current.remove(index),
          move: (from, to) => latest.current.move(from, to),
          swap: (a, b) => latest.current.swap(a, b),
          update: (index, value) => latest.current.update(index, value),
          replace: (value) => latest.current.replace(value),
        },
        name,
        runRowMutation,
      ),
    [latest, name, runRowMutation],
  )

  const duplicate = React.useCallback(
    (index: number) => {
      const source = getAtPath(formMethods.getValues(), `${name}.${index}`)
      runRowMutation(name, { type: 'duplicate', index }, () =>
        latest.current.insert(index + 1, source),
      )
    },
    [formMethods, latest, name, runRowMutation],
  )

  const { fields } = fieldArray
  React.useLayoutEffect(
    () => arrayRegistry.register(name, { fields, ops }),
    [arrayRegistry, name, fields, ops],
  )

  return { fields, ...ops, duplicate }
}

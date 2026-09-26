import * as React from 'react'
import { useFieldArray } from 'react-hook-form'
import type { FieldDependencyResult } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import type { ArrayOperations } from '../context/arrayRegistry'
import { reindexDynamicMeta } from '../utils/reindexDynamicMeta'
import type { MutationType } from '../utils/reindexDynamicMeta'
import { useLatestRef } from './useLatestRef'

type SetDynamicMeta = React.Dispatch<
  React.SetStateAction<Record<string, Partial<FieldDependencyResult>>>
>

/** Reads a dot-notated path (e.g. `"groups.0.emails"`) from a values object. */
export function getAtPath(values: unknown, path: string): unknown {
  let current = values
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

const countOf = (value: unknown) => (Array.isArray(value) ? value.length : 1)

/**
 * Wraps array row operations so per-row dynamic meta (`"<name>.<i>.<child>"`
 * overrides) follows its row. Shared by the mounted field array and the
 * `setValue` fallback used by `useArrayField`.
 */
export function withRowMetaReindex(
  ops: ArrayOperations,
  name: string,
  setDynamicMeta: SetDynamicMeta,
): ArrayOperations {
  const reindex = (mutation: MutationType) =>
    setDynamicMeta((prev) => reindexDynamicMeta(prev, name, mutation))

  return {
    append: ops.append,
    update: ops.update,
    prepend: (value, options) => {
      ops.prepend(value, options)
      reindex({ type: 'insert', index: 0, count: countOf(value) })
    },
    insert: (index, value, options) => {
      ops.insert(index, value, options)
      reindex({ type: 'insert', index, count: countOf(value) })
    },
    remove: (index) => {
      ops.remove(index)
      if (index === undefined) {
        reindex({ type: 'clear' })
        return
      }
      const indices = [...new Set(Array.isArray(index) ? index : [index])]
      for (const i of indices.sort((a, b) => b - a)) {
        reindex({ type: 'remove', index: i })
      }
    },
    move: (from, to) => {
      ops.move(from, to)
      reindex({ type: 'move', from, to })
    },
    swap: (a, b) => {
      ops.swap(a, b)
      reindex({ type: 'swap', a, b })
    },
    replace: (value) => {
      ops.replace(value)
      reindex({ type: 'clear' })
    },
  }
}

/**
 * Mounts the field array at `name`, wraps its operations so row overrides
 * follow their rows, and publishes them to the form's array registry so
 * `useArrayField(name)` drives this instance. Used by every component that
 * renders an array's rows.
 */
export function useRegisteredFieldArray(name: string) {
  const { control, formMethods, setDynamicMeta, arrayRegistry } =
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
        setDynamicMeta,
      ),
    [latest, name, setDynamicMeta],
  )

  const duplicate = React.useCallback(
    (index: number) => {
      const source = getAtPath(formMethods.getValues(), `${name}.${index}`)
      latest.current.insert(index + 1, source)
      setDynamicMeta((prev) =>
        reindexDynamicMeta(prev, name, { type: 'duplicate', index }),
      )
    },
    [formMethods, latest, name, setDynamicMeta],
  )

  const { fields } = fieldArray
  React.useLayoutEffect(
    () => arrayRegistry.register(name, { fields, ops }),
    [arrayRegistry, name, fields, ops],
  )

  return { fields, ...ops, duplicate }
}

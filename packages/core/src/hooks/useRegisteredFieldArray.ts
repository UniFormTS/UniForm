import * as React from 'react'
import { useFieldArray } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldDependencyResult } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import {
  reindexDynamicMeta,
  type MutationType,
} from '../utils/reindexDynamicMeta'
import type { ArrayFieldActions } from './arrayFieldRegistry'

type DynamicMeta = Record<string, Partial<FieldDependencyResult>>

function clearRowMeta(prev: DynamicMeta, arrayName: string): DynamicMeta {
  const rowKey = new RegExp(
    `^${arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.\\d+\\.`,
  )
  const keys = Object.keys(prev)
  if (!keys.some((key) => rowKey.test(key))) return prev
  return Object.fromEntries(
    Object.entries(prev).filter(([key]) => !rowKey.test(key)),
  )
}

const payloadCount = (value: unknown) =>
  Array.isArray(value) ? value.length : 1

/**
 * Mounts the field array for `name`, wraps every row operation so per-row
 * dynamic meta follows its row, and publishes the wrapped operations so
 * `useArrayField` drives this same field array.
 */
export function useRegisteredFieldArray(
  control: Control,
  name: string,
  shouldUnregister?: boolean,
) {
  const { _internal } = useAutoFormContext()
  const { setDynamicMeta, arrayFields } = _internal
  const raw = useFieldArray({ control, name, shouldUnregister })
  const { fields, append, prepend, insert, remove, move, swap, update } = raw
  const replaceRaw = raw.replace

  const actions = React.useMemo<ArrayFieldActions>(() => {
    const reindex = (...mutations: MutationType[]) =>
      setDynamicMeta((prev) =>
        mutations.reduce(
          (meta, mutation) => reindexDynamicMeta(meta, name, mutation),
          prev,
        ),
      )
    const repeat = (count: number, mutation: MutationType) =>
      Array.from({ length: count }, () => mutation)

    return {
      fields,
      append: (value) => append(value as never),
      prepend: (value) => {
        prepend(value as never)
        reindex(...repeat(payloadCount(value), { type: 'add', index: 0 }))
      },
      insert: (index, value) => {
        insert(index, value as never)
        reindex(...repeat(payloadCount(value), { type: 'add', index }))
      },
      remove: (index) => {
        remove(index)
        if (index == null) {
          setDynamicMeta((prev) => clearRowMeta(prev, name))
          return
        }
        const indices = [...new Set(Array.isArray(index) ? index : [index])]
        indices.sort((a, b) => b - a)
        reindex(
          ...indices.map((i): MutationType => ({ type: 'remove', index: i })),
        )
      },
      move: (from, to) => {
        move(from, to)
        reindex({ type: 'move', from, to })
      },
      swap: (a, b) => {
        swap(a, b)
        if (a === b) return
        const [lo, hi] = a < b ? [a, b] : [b, a]
        reindex(
          { type: 'move', from: lo, to: hi },
          { type: 'move', from: hi - 1, to: lo },
        )
      },
      update: (index, value) => update(index, value as never),
      replace: (values) => {
        replaceRaw(values as never)
        setDynamicMeta((prev) => clearRowMeta(prev, name))
      },
    }
  }, [
    fields,
    append,
    prepend,
    insert,
    remove,
    move,
    swap,
    update,
    replaceRaw,
    name,
    setDynamicMeta,
  ])

  React.useEffect(
    () => arrayFields.register(name, actions),
    [arrayFields, name, actions],
  )

  /** Inserts a copy of row `index` and copies that row's dynamic meta with it. */
  const duplicate = React.useCallback(
    (index: number, value: unknown) => {
      insert(index + 1, value as never)
      setDynamicMeta((prev) =>
        reindexDynamicMeta(prev, name, { type: 'duplicate', index }),
      )
    },
    [insert, name, setDynamicMeta],
  )

  return { rows: fields, actions, duplicate, replaceValues: replaceRaw }
}

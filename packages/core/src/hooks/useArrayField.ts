import * as React from 'react'
import { useWatch } from 'react-hook-form'
import type { FieldConfig } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import { resolveFieldAt } from '../utils/resolveFieldAt'
import type { ArrayFieldActions } from './arrayFieldRegistry'

/**
 * Finds the array field config at a dot-notated path, including nested and
 * indexed paths such as `"groups.0.emails"`.
 */
function findArrayConfig(
  fields: FieldConfig[],
  name: string,
): Extract<FieldConfig, { type: 'array' }> | undefined {
  const resolved = resolveFieldAt(fields, name)
  return resolved?.config.type === 'array' ? resolved.config : undefined
}

function toPayload(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value]
}

/**
 * Values-level array operations, used only when no `ArrayField` is mounted for
 * the path (a `hidden` array, or one rendered by a fully custom component).
 *
 * Writing through `setValue` is correct here precisely because nothing is
 * registered per index, so there is no react-hook-form row bookkeeping to keep
 * in step.
 */
function createFallbackActions(
  fieldName: string,
  rows: unknown[],
  readRows: () => unknown[],
  setValue: (name: string, value: unknown) => void,
): ArrayFieldActions {
  const write = (next: unknown[]) => setValue(fieldName, next)
  // Read the store on every call, so two operations in one handler compose.
  const edit = (fn: (current: unknown[]) => unknown[]) => write(fn(readRows()))
  return {
    fields: rows.map((row, index) => ({
      ...(row && typeof row === 'object' ? row : {}),
      id: `${fieldName}-${index}`,
    })),
    append: (value) => edit((current) => [...current, ...toPayload(value)]),
    prepend: (value) => edit((current) => [...toPayload(value), ...current]),
    insert: (index, value) =>
      edit((current) => [
        ...current.slice(0, index),
        ...toPayload(value),
        ...current.slice(index),
      ]),
    remove: (index) => {
      if (index == null) return write([])
      const drop = new Set(Array.isArray(index) ? index : [index])
      edit((current) => current.filter((_, i) => !drop.has(i)))
    },
    move: (from, to) =>
      edit((current) => {
        const next = [...current]
        next.splice(to, 0, ...next.splice(from, 1))
        return next
      }),
    swap: (from, to) =>
      edit((current) => {
        const next = [...current]
        ;[next[from], next[to]] = [next[to], next[from]]
        return next
      }),
    update: (index, value) =>
      edit((current) => current.map((row, i) => (i === index ? value : row))),
    replace: (values) => write([...values]),
  }
}

/**
 * Access the operations and reactive state of a named array field from
 * anywhere inside an `<AutoForm>` tree.
 *
 * Useful for rendering action buttons (e.g. "Add Row") outside the array
 * field's own wrapper — in a toolbar, section header, or custom form layout.
 * `minItems` / `maxItems` are derived automatically from the Zod schema.
 *
 * The hook delegates to the field array that renders the rows, so `append()`
 * from outside immediately adds a *visible* row. When UniForm does not render
 * the array (it is `hidden`, or replaced by a custom component) the operations
 * fall back to writing the array value directly.
 *
 * @param fieldName - Dot-notated path to the array field (e.g. `"lineItems"`).
 *
 * @example
 * function AddRowButton() {
 *   const { append, canAdd, rowCount } = useArrayField('lineItems')
 *   return (
 *     <button disabled={!canAdd} onClick={() => append({})}>
 *       Add Item ({rowCount})
 *     </button>
 *   )
 * }
 */
export function useArrayField(fieldName: string) {
  const { control, _internal, formMethods } = useAutoFormContext()
  const { resolvedFields, arrayFields } = _internal

  const live = React.useSyncExternalStore(
    arrayFields.subscribe,
    () => arrayFields.get(fieldName),
    () => arrayFields.get(fieldName),
  )

  // Keeps the hook reactive to row count even before the rendered array has
  // registered, and supplies the rows the fallback operations work from.
  const watched = useWatch({ control, name: fieldName as never }) as unknown
  const rows = React.useMemo(
    () => (Array.isArray(watched) ? (watched as unknown[]) : []),
    [watched],
  )

  const setValue = formMethods.setValue as (
    name: string,
    value: unknown,
  ) => void
  const getValues = formMethods.getValues
  const fallback = React.useMemo(() => {
    const readRows = () => {
      let cursor: unknown = getValues()
      for (const segment of fieldName.split('.')) {
        if (cursor == null || typeof cursor !== 'object') return []
        cursor = (cursor as Record<string, unknown>)[segment]
      }
      return Array.isArray(cursor) ? (cursor as unknown[]) : []
    }
    return createFallbackActions(fieldName, rows, readRows, setValue)
  }, [fieldName, rows, getValues, setValue])

  const actions = live ?? fallback
  const config = findArrayConfig(resolvedFields, fieldName)

  React.useEffect(() => {
    if (live || config) return
    console.warn(
      `[UniForm] useArrayField("${fieldName}") found no array field at that path. ` +
        'No <ArrayField> is mounted for it and it is not an array in the form schema, ' +
        'so the returned operations will not affect the form. Check the path spelling.',
    )
  }, [fieldName, live, config])

  const rowCount = live ? live.fields.length : rows.length
  const minItems = config?.minItems
  const maxItems = config?.maxItems
  const canAdd = maxItems == null || rowCount < maxItems
  const atMin = minItems != null && rowCount <= minItems

  return {
    ...actions,
    rowCount,
    canAdd,
    atMin,
  }
}

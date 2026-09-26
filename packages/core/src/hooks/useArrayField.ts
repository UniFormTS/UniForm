import * as React from 'react'
import { useWatch } from 'react-hook-form'
import type { FieldConfig, FormMethods } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'
import type {
  ArrayOperations,
  ArrayRegistration,
} from '../context/arrayRegistry'
import { getAtPath, withRowMetaReindex } from './useRegisteredFieldArray'

function findField(
  fields: FieldConfig[],
  path: string,
): FieldConfig | undefined {
  for (const field of fields) {
    if (field.name === path) return field
    if (!path.startsWith(`${field.name}.`)) continue
    if (field.type === 'object') return findField(field.children, path)
    // Array item children are named relative to the row
    if (field.type === 'array' && field.itemConfig.type === 'object') {
      return findField(
        field.itemConfig.children,
        path.slice(field.name.length + 1),
      )
    }
  }
  return undefined
}

/**
 * Finds the array field config for a dot-notated path. Row indices are
 * ignored, so `"groups.0.emails"` resolves to the `emails` array config.
 */
function findArrayConfig(
  fields: FieldConfig[],
  name: string,
): Extract<FieldConfig, { type: 'array' }> | undefined {
  const path = name
    .split('.')
    .filter((segment) => !/^\d+$/.test(segment))
    .join('.')
  const field = findField(fields, path)
  return field?.type === 'array' ? field : undefined
}

const toArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [value]

const toFallbackFields = (value: unknown, name: string) =>
  (Array.isArray(value) ? (value as unknown[]) : []).map((row, i) => ({
    ...(row !== null && typeof row === 'object' ? row : {}),
    id: `${name}.${i}`,
  }))

/**
 * Row operations that write the whole array with `setValue`. Each call reads
 * the current array from the store, so consecutive calls compose.
 */
function createValueOps(
  name: string,
  formMethods: FormMethods,
): ArrayOperations {
  const read = (): unknown[] => {
    const value = getAtPath(formMethods.getValues(), name)
    return Array.isArray(value) ? [...(value as unknown[])] : []
  }
  const write = (next: unknown[]) => formMethods.setValue(name, next)

  return {
    append: (value) => write([...read(), ...toArray(value)]),
    prepend: (value) => write([...toArray(value), ...read()]),
    insert: (index, value) => {
      const next = read()
      next.splice(index, 0, ...toArray(value))
      write(next)
    },
    remove: (index) => {
      if (index === undefined) return write([])
      const removed = new Set(toArray(index))
      write(read().filter((_, i) => !removed.has(i)))
    },
    move: (from, to) => {
      const next = read()
      next.splice(to, 0, ...next.splice(from, 1))
      write(next)
    },
    swap: (a, b) => {
      const next = read()
      ;[next[a], next[b]] = [next[b], next[a]]
      write(next)
    },
    update: (index, value) => {
      const next = read()
      next[index] = value
      write(next)
    },
    replace: (value) => write([...toArray(value)]),
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
 * Operations drive the rendered array's own field array. When nothing renders
 * the array (e.g. it is `hidden`), they write the array value directly.
 *
 * @param fieldName - Dot-notated path to the array field (e.g. `"lineItems"`,
 *   `"groups.0.emails"`).
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
  const { control, fieldConfigs, formMethods, setDynamicMeta, arrayRegistry } =
    useAutoFormContext()

  const getRegistration = React.useCallback(
    (): ArrayRegistration | undefined => arrayRegistry.get(fieldName),
    [arrayRegistry, fieldName],
  )
  const registered = React.useSyncExternalStore(
    arrayRegistry.subscribe,
    getRegistration,
    getRegistration,
  )

  const isRendered = registered !== undefined
  // Watching is only a re-render trigger for the fallback; RHF returns a stale
  // value right after re-enabling, so the rows are read from the store instead.
  useWatch({ control, name: fieldName, disabled: isRendered })
  const fallbackFields = isRendered
    ? []
    : toFallbackFields(getAtPath(formMethods.getValues(), fieldName), fieldName)
  const fallbackOps = React.useMemo(
    () =>
      withRowMetaReindex(
        createValueOps(fieldName, formMethods),
        fieldName,
        setDynamicMeta,
      ),
    [fieldName, formMethods, setDynamicMeta],
  )

  const config = React.useMemo(
    () => findArrayConfig(fieldConfigs, fieldName),
    [fieldConfigs, fieldName],
  )
  const warned = React.useRef(false)
  React.useEffect(() => {
    if (config || warned.current) return
    warned.current = true
    console.warn(
      `[UniForm] useArrayField("${fieldName}"): no array field exists at this path.`,
    )
  }, [config, fieldName])

  const fields = registered?.fields ?? fallbackFields
  const ops = registered?.ops ?? fallbackOps
  const rowCount = fields.length
  const minItems = config?.minItems
  const maxItems = config?.maxItems
  const canAdd = maxItems == null || rowCount < maxItems
  const atMin = minItems != null && rowCount <= minItems

  return {
    fields,
    ...ops,
    rowCount,
    canAdd,
    atMin,
  }
}

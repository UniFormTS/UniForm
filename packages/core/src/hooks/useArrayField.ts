import { useFieldArray } from 'react-hook-form'
import type { FieldConfig } from '../types'
import { useAutoFormContext } from '../context/AutoFormContext'

/**
 * Recursively searches the field config tree for an array field by its
 * dot-notated name, handling top-level and nested (object-contained) arrays.
 */
function findArrayConfig(
  fields: FieldConfig[],
  name: string,
): Extract<FieldConfig, { type: 'array' }> | undefined {
  for (const field of fields) {
    if (field.name === name) {
      return field.type === 'array'
        ? (field as Extract<FieldConfig, { type: 'array' }>)
        : undefined
    }
    if (field.type === 'object') {
      const found = findArrayConfig(field.children, name)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Access the operations and reactive state of a named array field from
 * anywhere inside an `<AutoForm>` tree.
 *
 * Useful for rendering action buttons (e.g. "Add Row") outside the array
 * field's own wrapper — in a toolbar, section header, or custom form layout.
 * `minItems` / `maxItems` are derived automatically from the Zod schema.
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
  const { control, fieldConfigs } = useAutoFormContext()

  const result = useFieldArray({ control, name: fieldName as never })
  const rowCount = result.fields.length

  const config = findArrayConfig(fieldConfigs, fieldName)
  const minItems = config?.minItems
  const maxItems = config?.maxItems
  const canAdd = maxItems == null || rowCount < maxItems
  const atMin = minItems != null && rowCount <= minItems

  return {
    ...result,
    rowCount,
    canAdd,
    atMin,
  }
}

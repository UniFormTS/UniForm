import type { FieldConfig } from '../../types'

/**
 * Returns a sensible empty default value for a field based on its `type`.
 *
 * Used when appending new rows to an array field so that RHF starts each row
 * with typed, non-`undefined` values.
 *
 * - `string` → `''`
 * - `number` → `0`
 * - `boolean` → `false`
 * - `date` → `new Date()`
 * - `select` → first option value, or `''` if no options exist
 * - `object` → recursively built object using child defaults
 * - `array` → `[]`
 * - anything else → `undefined`
 */
export function getDefaultValue(field: FieldConfig): unknown {
  switch (field.type) {
    case 'string':
      return ''
    case 'number':
      return 0
    case 'boolean':
      return false
    case 'date':
      return new Date()
    case 'select':
      return field.options?.[0]?.value ?? ''
    case 'object': {
      const result: Record<string, unknown> = {}
      for (const child of field.children ?? []) {
        // Use only the last segment of the child's name for the key
        const key = child.name.split('.').pop() ?? child.name
        result[key] = getDefaultValue(child)
      }
      return result
    }
    case 'array':
      return []
    default:
      return undefined
  }
}

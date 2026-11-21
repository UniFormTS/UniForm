import type { FieldConfig } from '../../types'

/** Field types whose empty input is mapped by `getEmptyValue`. */
const TEXT_LIKE_TYPES = new Set(['string', 'number', 'date'])

/** Copies arrays and plain objects so form rows never share a default instance. */
function cloneDefault(value: unknown): unknown {
  if (Array.isArray(value)) return [...(value as unknown[])]
  if (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  ) {
    return { ...(value as Record<string, unknown>) }
  }
  return value
}

/**
 * Returns the value a text-like field should hold when its input is empty, so
 * that leaving it blank satisfies the schema whenever the schema allows it:
 *
 * - optional (incl. `nullish`) → `undefined`
 * - nullable only → `null`
 * - required `string` → `''`; required `number` / `date` → `undefined`
 */
export function getEmptyValue(field: FieldConfig): unknown {
  if (field.optional) return undefined
  if (field.nullable) return null
  return field.type === 'string' ? '' : undefined
}

/**
 * Returns the initial value for a field. This is the single source of defaults
 * for top-level fields, nested object children, discriminated-union variants and
 * newly appended array rows.
 *
 * - A schema `.default()` / `.prefault()` value always wins.
 * - `string` / `number` / `date` → {@link getEmptyValue}
 * - `boolean` → `false`
 * - `select` → first option value, or `''` if no options exist (the default
 *   select has no empty option, so the first option is what the user sees)
 * - `object` → recursively built object using child defaults
 * - `array` → `[]`
 * - anything else → `undefined`
 */
export function getDefaultValue(field: FieldConfig): unknown {
  if ('defaultValue' in field) return cloneDefault(field.defaultValue)
  if (TEXT_LIKE_TYPES.has(field.type)) return getEmptyValue(field)

  switch (field.type) {
    case 'boolean':
      return false
    case 'select':
      return field.options?.[0]?.value ?? ''
    case 'object': {
      const result: Record<string, unknown> = {}
      for (const child of field.children ?? []) {
        // Child names are dot-paths (or row-relative); the key is the last segment
        const key = child.name.split('.').pop() ?? child.name
        const value = getDefaultValue(child)
        if (value !== undefined) result[key] = value
      }
      return result
    }
    case 'array':
      return []
    default:
      return undefined
  }
}

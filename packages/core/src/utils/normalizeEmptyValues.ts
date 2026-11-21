import type { FieldConfig } from '../types'
import {
  TEXT_LIKE_TYPES,
  getEmptyValue,
} from '../components/fields/getDefaultValue'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

/** `true` when nothing in `value` was filled in (all leaves empty). */
function isUntouched(value: unknown): boolean {
  if (value === undefined || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (isPlainObject(value)) return Object.values(value).every(isUntouched)
  return false
}

function normalizeValue(value: unknown, field: FieldConfig): unknown {
  if (TEXT_LIKE_TYPES.has(field.type)) {
    return value === '' ? getEmptyValue(field) : value
  }

  let result = value
  if (field.type === 'object' && isPlainObject(value)) {
    result = normalizeEmptyValues(value, field.children)
  } else if (field.type === 'array' && Array.isArray(value)) {
    result = value.map((item) => normalizeValue(item, field.itemConfig))
  }

  // An untouched composite with a deferred (output-typed) default is dropped so
  // Zod applies the default instead of validating the empty shape.
  if (field.deferredDefault && isUntouched(result)) return undefined
  return result
}

/**
 * Maps empty form-state values to what the schema expects for "empty" before
 * validation: `''` in a text-like field becomes {@link getEmptyValue} (e.g.
 * `undefined` for optional, `null` for nullable). Recurses into nested objects
 * and array rows. Keys without a field config pass through. Does not mutate.
 */
export function normalizeEmptyValues(
  values: Record<string, unknown>,
  fields: FieldConfig[],
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...values }
  for (const field of fields) {
    // Child names are dot-paths (or row-relative); the key is the last segment
    const key = field.name.split('.').pop() ?? field.name
    if (key in result) result[key] = normalizeValue(result[key], field)
  }
  return result
}

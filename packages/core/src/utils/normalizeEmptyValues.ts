import type { FieldConfig } from '../types'
import {
  TEXT_LIKE_TYPES,
  getDefaultValue,
  getEmptyValue,
} from '../components/fields/getDefaultValue'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

/** Structural equality for form-state values (plain objects, arrays, dates). */
function isEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime()
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => isEqual(item, b[i]))
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    // Keys holding `undefined` count as absent
    const keys = new Set([...Object.keys(a), ...Object.keys(b)])
    return [...keys].every((key) => isEqual(a[key], b[key]))
  }
  return false
}

function normalizeValue(
  value: unknown,
  field: FieldConfig,
  path: string,
  skip: ReadonlySet<string>,
): unknown {
  // A composite with a deferred (output-typed) default that still equals its
  // seeded value was not touched: drop it so Zod applies the default. Compared
  // on raw form state, before blanks are mapped to null/undefined.
  if (
    field.deferredDefault &&
    (field.type === 'object' || field.type === 'array') &&
    (value === undefined || isEqual(value, getDefaultValue(field)))
  ) {
    return undefined
  }

  if (TEXT_LIKE_TYPES.has(field.type)) {
    return value === '' ? getEmptyValue(field) : value
  }

  if (field.type === 'object' && isPlainObject(value)) {
    return normalizeEmptyValues(value, field.children, skip, path)
  }
  if (field.type === 'array' && Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeValue(item, field.itemConfig, `${path}.${index}`, skip),
    )
  }
  return value
}

/**
 * Maps empty form-state values to what the schema expects for "empty" before
 * validation: `''` in a text-like field becomes {@link getEmptyValue} (e.g.
 * `undefined` for optional, `null` for nullable). Recurses into nested objects
 * and array rows. Keys without a field config pass through. Values at the
 * concrete paths in `skip` (e.g. hidden fields, removed afterwards) are left
 * as they are, so their schemas aren't consulted. Does not mutate.
 */
export function normalizeEmptyValues(
  values: Record<string, unknown>,
  fields: FieldConfig[],
  skip: ReadonlySet<string> = new Set(),
  basePath = '',
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...values }
  for (const field of fields) {
    // Child names are dot-paths (or row-relative); the key is the last segment
    const key = field.name.split('.').pop() ?? field.name
    const path = basePath ? `${basePath}.${key}` : key
    if (key in result && !skip.has(path)) {
      result[key] = normalizeValue(result[key], field, path, skip)
    }
  }
  return result
}

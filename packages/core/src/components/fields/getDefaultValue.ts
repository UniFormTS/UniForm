import { safeParse } from 'zod/v4/core'
import type { FieldConfig } from '../../types'

/**
 * Field types rendered as text-like inputs. In form state an empty one always
 * holds `''` (RHF can't display a controlled `undefined` — it falls back to the
 * value captured at mount); `normalizeEmptyValues` maps `''` to
 * {@link getEmptyValue} right before validation.
 */
export const TEXT_LIKE_TYPES = new Set(['string', 'number', 'date'])

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
 * Returns the value submitted for an empty text-like field, so that leaving it
 * blank satisfies the schema whenever the schema allows it:
 *
 * - optional (incl. `nullish`) → `undefined`
 * - nullable only → `null`
 * - required `string` → `''`
 * - required `number` / `date` → `''` when the schema accepts it (e.g. the
 *   collapsed plain union `z.number().or(z.literal(''))`), otherwise `undefined`
 */
export function getEmptyValue(field: FieldConfig): unknown {
  if (field.optional) return undefined
  if (field.nullable) return null
  if (field.type === 'string') return ''
  return acceptsEmptyString(field) ? '' : undefined
}

function acceptsEmptyString(field: FieldConfig): boolean {
  try {
    return safeParse(field.schema, '').success
  } catch {
    // e.g. async refinements, which can't be checked synchronously
    return false
  }
}

/**
 * Returns the initial form-state value for a field. This is the single source of
 * defaults for top-level fields, nested object children, discriminated-union
 * variants and newly appended array rows.
 *
 * - A schema `.default()` / `.prefault()` value always wins (suppliers run on
 *   every call, so each new row gets a fresh value).
 * - A deferred (output-typed) default leaves the field untouched: `''` for
 *   text-like fields, `undefined` otherwise, so Zod applies the default.
 * - `string` / `number` / `date` → `''`
 * - `boolean` → `false`
 * - `select` → first option value, or `''` if no options exist (the default
 *   select has no empty option, so the first option is what the user sees)
 * - `object` → recursively built object using child defaults
 * - `array` → `[]`
 * - anything else → `undefined`
 */
export function getDefaultValue(field: FieldConfig): unknown {
  if (field.getDefault) return cloneDefault(field.getDefault())
  if (TEXT_LIKE_TYPES.has(field.type)) return ''
  if (field.deferredDefault) return undefined

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

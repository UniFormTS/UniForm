// ---------------------------------------------------------------------------
// Coercion utilities
// ---------------------------------------------------------------------------

export type CoercionMap = Record<string, (value: unknown) => unknown>

/**
 * Built-in coercion functions for the primitive field types. Each function
 * converts the raw string value that comes from an HTML `<input>` into the
 * type expected by the Zod schema before validation is applied.
 *
 * - `number` — converts to `Number`; returns `undefined` for empty/null inputs.
 * - `date` — converts to `Date`; returns `undefined` for empty/null inputs.
 * - `boolean` — converts to `Boolean`.
 * - `string` — converts `null` / `undefined` to `''`, otherwise `String(value)`.
 */
export const defaultCoercionMap: CoercionMap = {
  number: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  },
  date: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined
    const d = new Date(String(value as string | number | Date))
    return isNaN(d.getTime()) ? value : d
  },
  boolean: (value: unknown) => Boolean(value),
  string: (value: unknown) =>
    value == null || value == undefined
      ? ''
      : String(value as string | number | boolean),
}

/**
 * Coerces `value` to the type expected by `type`, using `customCoercions` first
 * and falling back to {@link defaultCoercionMap}.
 *
 * Returns the value unchanged when no coercion function is found for the given type.
 *
 * @param type - The field type string (e.g. `'number'`, `'date'`).
 * @param value - The raw value to coerce.
 * @param customCoercions - Optional per-instance overrides that take precedence
 *   over the built-in coercion map.
 */
export function coerceValue(
  type: string,
  value: unknown,
  customCoercions?: CoercionMap,
): unknown {
  const coercionFn = customCoercions?.[type] ?? defaultCoercionMap[type]
  if (!coercionFn) return value
  return coercionFn(value)
}

// ---------------------------------------------------------------------------
// Coercion utilities
// ---------------------------------------------------------------------------

export type CoercionMap = Record<string, (value: unknown) => unknown>

export const defaultCoercionMap: CoercionMap = {
  number: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  },
  date: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined
    const d = new Date(String(value))
    return isNaN(d.getTime()) ? value : d
  },
  boolean: (value: unknown) => Boolean(value),
  string: (value: unknown) =>
    value == null || value == undefined ? '' : String(value),
}

export function coerceValue(
  type: string,
  value: unknown,
  customCoercions?: CoercionMap,
): unknown {
  const coercionFn = customCoercions?.[type] ?? defaultCoercionMap[type]
  if (!coercionFn) return value
  return coercionFn(value)
}

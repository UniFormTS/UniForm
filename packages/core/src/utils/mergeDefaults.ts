function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  )
}

/**
 * Merges user-supplied initial values (`source`) over generated defaults
 * (`base`), recursing into plain objects so a partial nested value such as
 * `{ prefs: { news: true } }` keeps the generated defaults of its siblings.
 *
 * Arrays, dates and other non-plain values are replaced, not merged. An
 * `undefined` source value keeps the base value. Inputs are not mutated.
 */
export function mergeDefaults(
  base: Record<string, unknown>,
  source: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  if (!source) return result
  for (const [key, value] of Object.entries(source)) {
    if (value === undefined) continue
    const current = result[key]
    result[key] =
      isPlainObject(current) && isPlainObject(value)
        ? mergeDefaults(current, value)
        : value
  }
  return result
}

/**
 * Returns a copy of `values` without the dot-notated `path`, copying only the
 * objects along the path (inputs are not mutated). Returns `values` unchanged
 * when the path doesn't exist or crosses a non-plain value such as an array
 * (row-scoped paths like `"tasks.note"` are left to their rendered fields).
 */
export function omitPath(
  values: Record<string, unknown>,
  path: string,
): Record<string, unknown> {
  const [head, ...rest] = path.split('.')
  if (!(head in values)) return values
  if (!rest.length) {
    const result = { ...values }
    delete result[head]
    return result
  }
  const child = values[head]
  if (!isPlainObject(child)) return values
  const updated = omitPath(child, rest.join('.'))
  return updated === child ? values : { ...values, [head]: updated }
}

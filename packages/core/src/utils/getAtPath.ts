/**
 * Reads a dot-notated path (e.g. `"groups.0.emails"`) from a values object.
 * Returns `undefined` when a step is missing or not an object.
 */
export function getAtPath(values: unknown, path: string): unknown {
  let current = values
  for (const part of path.split('.')) {
    if (current == null || typeof current !== 'object') return undefined
    current = (current as Record<string, unknown>)[part]
  }
  return current
}

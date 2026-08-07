import type { FieldErrors } from 'react-hook-form'

/**
 * Key for issues that belong to the form as a whole rather than to any field.
 *
 * Not `'root'`: react-hook-form reserves that key and calls
 * `unset(errors, 'root')` on every submit, which would silently drop a
 * cross-entity issue *and* let the form submit. Address it as `''` through
 * `useFieldError` / `setIssues` instead of using this key directly.
 */
export const ROOT_ERROR_KEY = '__uniformRoot'

export type RequirementEntry = {
  /** The registered path, e.g. `"sectors.orderReason"`. */
  path: string
  predicate: (
    values: Record<string, unknown>,
    allValues: Record<string, unknown>,
  ) => boolean
}

/**
 * Empty for the purposes of requiredness: `undefined`, `null`, `''` and `[]`.
 * `false` and `0` are values, not absences.
 */
export function isEmptyValue(value: unknown): boolean {
  if (value === undefined || value === null) return true
  if (typeof value === 'string') return value === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

function readPath(source: unknown, segment: string): unknown {
  if (source == null || typeof source !== 'object') return undefined
  return (source as Record<string, unknown>)[segment]
}

/**
 * Expands a registered requirement path into the concrete paths it addresses,
 * fanning out over array rows.
 *
 * `"sectors.orderReason"` against two rows yields `sectors.0.orderReason` and
 * `sectors.1.orderReason`, each carrying its row as the predicate's scope —
 * the same convention `setCondition` uses.
 */
export function expandRequirementPath(
  path: string,
  values: unknown,
): { path: string; scope: unknown; value: unknown }[] {
  const segments = path.split('.')

  let frontier: { path: string[]; container: unknown; scope: unknown }[] = [
    { path: [], container: values, scope: values },
  ]

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    const isLast = i === segments.length - 1
    const next: typeof frontier = []

    for (const node of frontier) {
      const child = readPath(node.container, segment)

      // An array followed by a non-numeric segment addresses every row.
      if (
        !isLast &&
        Array.isArray(child) &&
        !/^\d+$/.test(segments[i + 1] ?? '')
      ) {
        child.forEach((row, index) => {
          next.push({
            path: [...node.path, segment, String(index)],
            container: row,
            scope: row,
          })
        })
        continue
      }

      next.push({
        path: [...node.path, segment],
        container: child,
        scope: node.scope,
      })
    }
    frontier = next
  }

  return frontier.map((node) => ({
    path: node.path.join('.'),
    scope: node.scope,
    value: node.container,
  }))
}

function setAt(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.')
  let cursor = target
  for (let i = 0; i < segments.length - 1; i++) {
    const key = segments[i]
    const existing = cursor[key]
    if (existing == null || typeof existing !== 'object') {
      cursor[key] = /^\d+$/.test(segments[i + 1]) ? [] : {}
    }
    cursor = cursor[key] as Record<string, unknown>
  }
  cursor[segments[segments.length - 1]] = value
}

function getAt(source: unknown, path: string): unknown {
  let cursor: unknown = source
  for (const segment of path.split('.')) {
    if (cursor == null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

/**
 * Merges a `required` error into the resolver's error tree at every path whose
 * predicate says required and whose value is empty.
 *
 * An error Zod already reported at a path is never overwritten — the schema
 * remains the more specific source of truth.
 */
export function applyRequiredErrors(
  errors: FieldErrors,
  values: unknown,
  requirements: RequirementEntry[],
  message: string,
): FieldErrors {
  if (!requirements.length) return errors

  let merged: Record<string, unknown> | undefined

  for (const { path, predicate } of requirements) {
    for (const target of expandRequirementPath(path, values)) {
      if (
        !predicate(
          target.scope as Record<string, unknown>,
          values as Record<string, unknown>,
        )
      ) {
        continue
      }
      if (!isEmptyValue(target.value)) continue

      const existing = getAt(merged ?? errors, target.path)
      if (existing && typeof existing === 'object' && 'message' in existing) {
        continue
      }

      merged ??= { ...(errors as Record<string, unknown>) }
      setAt(merged, target.path, { type: 'required', message })
    }
  }

  return (merged ?? errors) as FieldErrors
}

/**
 * Moves issues whose Zod path was empty onto the `root` key.
 *
 * `superRefine` issues raised with no path (cross-entity rules) otherwise land
 * under a `''` key that nothing can render.
 */
export function normalizeRootErrors(errors: FieldErrors): FieldErrors {
  const raw = errors as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(raw, '')) return errors
  const { '': rootError, ...rest } = raw
  return {
    ...rest,
    [ROOT_ERROR_KEY]: raw[ROOT_ERROR_KEY] ?? rootError,
  } as FieldErrors
}

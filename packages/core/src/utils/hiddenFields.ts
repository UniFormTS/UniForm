import * as z from 'zod/v4/core'
import type { FieldConfig } from '../types'
import {
  applyRowDynamicMeta,
  type ArrayFieldConfigWithRowMeta,
} from './fieldPipeline'

// ---------------------------------------------------------------------------
// Hidden fields
//
// Contract: a field hidden by `meta.hidden` (incl. `fields` overrides and
// `setFieldMeta`) or by a false `condition` is neither validated nor
// submitted. These helpers find the hidden paths the way the renderer does,
// remove them from values/errors, and relax the schema at those paths.
// ---------------------------------------------------------------------------

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

const getAtPath = (values: unknown, path: string): unknown =>
  path.split('.').reduce<unknown>((current, key) => {
    if (current == null || typeof current !== 'object') return undefined
    return (current as Record<string, unknown>)[key]
  }, values)

function isHidden(field: FieldConfig, conditionValues: unknown): boolean {
  if (field.meta.hidden) return true
  if (typeof field.meta.condition !== 'function') return false
  try {
    return !field.meta.condition(conditionValues as Record<string, unknown>)
  } catch {
    return false // the renderer would surface the error; don't hide on it
  }
}

export type HiddenField = { path: string; field: FieldConfig }

/**
 * Returns the fields currently hidden with their concrete paths (e.g.
 * `"detail"`, `"prefs.reason"`, `"rows.0.note"`), mirroring how they render:
 * conditions receive the full values, or the row's values inside an array;
 * per-row dynamic meta applies per row; a hidden parent hides its subtree (only
 * the parent is returned). Composites rendered by a custom component are
 * treated as leaves.
 */
export function collectHiddenFields(
  fields: FieldConfig[],
  values: Record<string, unknown>,
  prefix = '',
): HiddenField[] {
  const conditionValues = prefix ? getAtPath(values, prefix) : values
  const hidden: HiddenField[] = []

  for (const field of fields) {
    const path = prefix
      ? field.name
        ? `${prefix}.${field.name}`
        : prefix
      : field.name
    if (isHidden(field, conditionValues)) {
      hidden.push({ path, field })
      continue
    }
    if (typeof field.meta.component === 'function') continue

    if (field.type === 'object') {
      // Object children keep the parent's condition scope (see ObjectField)
      hidden.push(...collectHiddenFields(field.children, values, prefix))
    } else if (field.type === 'array') {
      const rows = getAtPath(values, path)
      if (!Array.isArray(rows)) continue
      const rowMeta = (field as ArrayFieldConfigWithRowMeta)._rowDynamicMeta
      rows.forEach((_, index) => {
        const itemConfig = rowMeta?.[index]
          ? applyRowDynamicMeta(field.itemConfig, rowMeta[index])
          : field.itemConfig
        if (itemConfig.type === 'object') {
          hidden.push(
            ...collectHiddenFields(
              itemConfig.children,
              values,
              `${path}.${index}`,
            ),
          )
        }
      })
    }
  }
  return hidden
}

/** Paths of the fields currently hidden; see {@link collectHiddenFields}. */
export const collectHiddenPaths = (
  fields: FieldConfig[],
  values: Record<string, unknown>,
): string[] => collectHiddenFields(fields, values).map((h) => h.path)

/** Deep-copies plain objects and arrays (other values are returned as-is). */
export function cloneValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneValue) as T
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, cloneValue(v)]),
    ) as T
  }
  return value
}

function omitPath(value: unknown, keys: string[]): unknown {
  const [head, ...rest] = keys
  if (Array.isArray(value)) {
    const index = Number(head)
    if (!Number.isInteger(index) || index < 0 || index >= value.length) {
      return value
    }
    const next = [...(value as unknown[])]
    next[index] = rest.length ? omitPath(value[index], rest) : undefined
    return next
  }
  if (!isPlainObject(value) || !(head in value)) return value
  const next = { ...value }
  if (rest.length) {
    next[head] = omitPath(value[head], rest)
  } else {
    delete next[head]
  }
  return next
}

/**
 * Returns a copy of `values` without the given dot-notated paths (array
 * indices allowed), copying only along each path. Missing paths are ignored.
 */
export function omitPaths<T extends Record<string, unknown>>(
  values: T,
  paths: string[],
): T {
  return paths.reduce<T>((acc, path) => omitPath(acc, path.split('.')) as T, values)
}

/** Drops array indices: `"rows.3.note"` → `"rows.note"`. */
export const toSchemaPath = (path: string): string =>
  path
    .split('.')
    .filter((segment) => !/^\d+$/.test(segment))
    .join('.')

type Def = Record<string, unknown> & { type: string }

const WRAPPERS_WITH_INNER = new Set([
  'optional',
  'nullable',
  'default',
  'prefault',
  'readonly',
  'nonoptional',
  'catch',
])

function relax(schema: z.$ZodType, paths: string[][]): z.$ZodType {
  if (!paths.length) return schema
  if (paths.some((p) => p.length === 0)) {
    return new z.$ZodOptional({ type: 'optional', innerType: schema })
  }
  const def = schema._zod.def as unknown as Def
  const withDef = (changes: Record<string, unknown>) =>
    z.clone(schema, { ...def, ...changes } as never)

  if (def.type === 'object') {
    const shape = def.shape as Record<string, z.$ZodType>
    const byKey = new Map<string, string[][]>()
    for (const [key, ...rest] of paths) {
      if (!(key in shape)) continue
      byKey.set(key, [...(byKey.get(key) ?? []), rest])
    }
    if (!byKey.size) return schema
    const nextShape = { ...shape }
    for (const [key, rest] of byKey) nextShape[key] = relax(shape[key], rest)
    return withDef({ shape: nextShape })
  }
  if (def.type === 'array') {
    return withDef({ element: relax(def.element as z.$ZodType, paths) })
  }
  if (WRAPPERS_WITH_INNER.has(def.type)) {
    return withDef({ innerType: relax(def.innerType as z.$ZodType, paths) })
  }
  if (def.type === 'pipe') {
    return withDef({ in: relax(def.in as z.$ZodType, paths) })
  }
  if (def.type === 'union') {
    return withDef({
      options: (def.options as z.$ZodType[]).map((o) => relax(o, paths)),
    })
  }
  if (def.type === 'intersection') {
    return withDef({
      left: relax(def.left as z.$ZodType, paths),
      right: relax(def.right as z.$ZodType, paths),
    })
  }
  return schema
}

/**
 * Returns a copy of `schema` in which each schema path (no array indices, e.g.
 * `"rows.note"`) accepts `undefined`, descending through objects, arrays,
 * wrappers, pipes and union variants. Everything else — including transforms,
 * defaults and refinements — is kept. Returns `schema` itself for no paths.
 */
export function relaxSchemaAt<T extends z.$ZodType>(
  schema: T,
  paths: string[],
): T {
  return relax(
    schema,
    paths.map((p) => p.split('.')),
  ) as T
}

/** Removes empty objects/arrays left behind after pruning errors. */
function compactErrors(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(compactErrors)
    return items.some((item) => item !== undefined) ? items : undefined
  }
  if (!isPlainObject(value)) return value
  // A field error (has `type` / `message`) is a leaf
  if ('type' in value || 'message' in value) return value
  const entries = Object.entries(value)
    .map(([key, item]) => [key, compactErrors(item)] as const)
    .filter(([, item]) => item !== undefined)
  return entries.length ? Object.fromEntries(entries) : undefined
}

/** Returns `errors` without entries at or below the given paths. */
export function omitErrorsAt(
  errors: Record<string, unknown>,
  paths: string[],
): Record<string, unknown> {
  return (compactErrors(omitPaths(errors, paths)) ?? {}) as Record<
    string,
    unknown
  >
}

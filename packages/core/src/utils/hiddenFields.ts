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

export type HiddenField = {
  /** Concrete path in the form values, e.g. `"rows.0.note"`. */
  path: string
  /** The same path in the schema (array indices removed), e.g. `"rows.note"`. */
  schemaPath: string
  field: FieldConfig
}

type IsCustomRendered = (field: FieldConfig) => boolean

const joinPath = (prefix: string, name: string) =>
  prefix ? (name ? `${prefix}.${name}` : prefix) : name

/**
 * Returns the fields currently hidden with their concrete and schema paths,
 * mirroring how they render: conditions receive the full values, or the row's
 * values inside an array; per-row dynamic meta applies per row; a hidden parent
 * hides its subtree (only the parent is returned); arrays of any item shape are
 * walked row by row. Fields (and array items) for which `isCustomRendered`
 * returns true — by default a component function in `meta.component` — are
 * leaves, since their component renders the subtree.
 */
export function collectHiddenFields(
  fields: FieldConfig[],
  values: Record<string, unknown>,
  isCustomRendered: IsCustomRendered = (field) =>
    typeof field.meta.component === 'function',
): HiddenField[] {
  const hidden: HiddenField[] = []

  const walkArray = (field: FieldConfig, path: string, schemaPath: string) => {
    if (field.type !== 'array') return
    const rows = getAtPath(values, path)
    if (!Array.isArray(rows)) return
    const rowMeta = (field as ArrayFieldConfigWithRowMeta)._rowDynamicMeta
    rows.forEach((_, index) => {
      const item = rowMeta?.[index]
        ? applyRowDynamicMeta(field.itemConfig, rowMeta[index])
        : field.itemConfig
      if (isCustomRendered(item)) return
      const rowPath = `${path}.${index}`
      // Row children are named relative to the row, which is also their
      // condition scope (see ArrayField / ObjectField)
      if (item.type === 'object') walkFields(item.children, rowPath, schemaPath)
      else if (item.type === 'array') walkArray(item, rowPath, schemaPath)
    })
  }

  const walkFields = (
    list: FieldConfig[],
    prefix: string,
    schemaPrefix: string,
  ) => {
    const conditionValues = prefix ? getAtPath(values, prefix) : values
    for (const field of list) {
      const path = joinPath(prefix, field.name)
      const schemaPath = joinPath(schemaPrefix, field.name)
      if (isHidden(field, conditionValues)) {
        hidden.push({ path, schemaPath, field })
        continue
      }
      // A custom component owns its subtree: nested conditions don't apply
      if (isCustomRendered(field)) continue
      // Object children are named from the root of the current scope and keep
      // its condition values (see ObjectField)
      if (field.type === 'object')
        walkFields(field.children, prefix, schemaPrefix)
      else if (field.type === 'array') walkArray(field, path, schemaPath)
    }
  }

  walkFields(fields, '', '')
  return hidden
}

/** Paths of the fields currently hidden; see {@link collectHiddenFields}. */
export const collectHiddenPaths = (
  fields: FieldConfig[],
  values: Record<string, unknown>,
  isCustomRendered?: IsCustomRendered,
): string[] =>
  collectHiddenFields(fields, values, isCustomRendered).map((h) => h.path)

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
  return paths.reduce<T>(
    (acc, path) => omitPath(acc, path.split('.')) as T,
    values,
  )
}

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

type Leaf = (schema: z.$ZodType) => z.$ZodType

function transformAt(
  schema: z.$ZodType,
  paths: string[][],
  leaf: Leaf,
): z.$ZodType {
  if (!paths.length) return schema
  if (paths.some((p) => p.length === 0)) return leaf(schema)
  const def = schema._zod.def as unknown as Def
  const at = (s: unknown) => transformAt(s as z.$ZodType, paths, leaf)
  const withDef = (changes: Record<string, unknown>) =>
    z.clone(schema, { ...def, ...changes } as never)

  if (def.type === 'object') {
    const shape = def.shape as Record<string, z.$ZodType>
    const byKey = new Map<string, string[][]>()
    for (const [key, ...rest] of paths) {
      if (!Object.prototype.hasOwnProperty.call(shape, key)) continue
      byKey.set(key, [...(byKey.get(key) ?? []), rest])
    }
    if (!byKey.size) return schema
    const nextShape = { ...shape }
    for (const [key, rest] of byKey) {
      nextShape[key] = transformAt(shape[key], rest, leaf)
    }
    return withDef({ shape: nextShape })
  }
  if (def.type === 'array') return withDef({ element: at(def.element) })
  if (WRAPPERS_WITH_INNER.has(def.type)) {
    return withDef({ innerType: at(def.innerType) })
  }
  // Both sides of a pipe: an object output schema re-checks the same keys
  if (def.type === 'pipe') return withDef({ in: at(def.in), out: at(def.out) })
  if (def.type === 'union') {
    return withDef({ options: (def.options as unknown[]).map(at) })
  }
  if (def.type === 'intersection') {
    return withDef({ left: at(def.left), right: at(def.right) })
  }
  return schema
}

const optional = (innerType: z.$ZodType) =>
  new z.$ZodOptional({ type: 'optional', innerType })

/**
 * Returns a copy of `schema` in which each schema path (no array indices, e.g.
 * `"rows.note"`) also accepts `undefined`, descending through objects, arrays,
 * wrappers, pipes (both sides) and union variants. The field's own schema —
 * transforms, defaults, refinements — is kept. Returns `schema` for no paths.
 */
export const relaxSchemaAt = <T extends z.$ZodType>(
  schema: T,
  paths: string[],
): T =>
  transformAt(
    schema,
    paths.map((p) => p.split('.')),
    optional,
  ) as T

/**
 * Like {@link relaxSchemaAt}, but replaces the schema at each path with an
 * optional `unknown`, so none of that field's validators, transforms or
 * defaults run. For fields hidden everywhere (not per array row).
 */
export const skipSchemaAt = <T extends z.$ZodType>(
  schema: T,
  paths: string[],
): T =>
  transformAt(
    schema,
    paths.map((p) => p.split('.')),
    () => optional(new z.$ZodUnknown({ type: 'unknown' })),
  ) as T

/** Removes empty objects/arrays left behind after pruning errors. */
function compactErrors(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(compactErrors)
    return items.some((item) => item !== undefined) ? items : undefined
  }
  if (!isPlainObject(value)) return value
  // A field error has a string `type` / `message` (a field may be named so)
  if (typeof value.type === 'string' || typeof value.message === 'string') {
    return value
  }
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

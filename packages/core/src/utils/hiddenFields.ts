import * as z from 'zod/v4/core'
import type { FieldConfig } from '../types'
import { getAtPath } from './getAtPath'
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

/**
 * The single rule for whether a field is hidden: `meta.hidden`, or a
 * `condition` that returns false for `conditionValues` (the full form values,
 * or the row's values inside an array). Used by the renderer
 * (`useConditionalFields`) and by validation; errors thrown by a condition
 * propagate, so each caller decides how to handle them. `render: false` is not
 * hidden — the value stays part of the form.
 */
export function isFieldHidden(
  field: FieldConfig,
  conditionValues: unknown,
): boolean {
  if (field.meta.hidden) return true
  if (typeof field.meta.condition !== 'function') return false
  return !field.meta.condition(conditionValues as Record<string, unknown>)
}

function isHidden(field: FieldConfig, conditionValues: unknown): boolean {
  try {
    return isFieldHidden(field, conditionValues)
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
  isCustomRendered?: IsCustomRendered,
): HiddenField[] {
  return analyzeVisibility(fields, values, isCustomRendered).hidden
}

export type Visibility = {
  hidden: HiddenField[]
  /** How many times each schema path inside array rows was reached. */
  rowOccurrences: Map<string, number>
}

/** {@link collectHiddenFields}, plus per-row occurrence counts. */
export function analyzeVisibility(
  fields: FieldConfig[],
  values: Record<string, unknown>,
  isCustomRendered: IsCustomRendered = (field) =>
    typeof field.meta.component === 'function',
): Visibility {
  const hidden: HiddenField[] = []
  const rowOccurrences = new Map<string, number>()

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
      if (path !== schemaPath) {
        rowOccurrences.set(
          schemaPath,
          (rowOccurrences.get(schemaPath) ?? 0) + 1,
        )
      }
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
  return { hidden, rowOccurrences }
}

/**
 * Schema paths of fields hidden by `meta.hidden` in the field configs
 * themselves — hidden in every row, even rows that don't exist in the input
 * (e.g. rows supplied by a default). Custom-rendered subtrees are skipped.
 */
export function collectStaticHiddenSchemaPaths(
  fields: FieldConfig[],
  isCustomRendered: IsCustomRendered = (field) =>
    typeof field.meta.component === 'function',
): string[] {
  const paths: string[] = []
  const walk = (list: FieldConfig[], schemaPrefix: string) => {
    for (const field of list) {
      const schemaPath = joinPath(schemaPrefix, field.name)
      if (field.meta.hidden === true) {
        paths.push(schemaPath)
        continue
      }
      if (isCustomRendered(field)) continue
      if (field.type === 'object') walk(field.children, schemaPrefix)
      else if (field.type === 'array') walkItem(field.itemConfig, schemaPath)
    }
  }
  const walkItem = (item: FieldConfig, schemaPath: string) => {
    if (isCustomRendered(item)) return
    if (item.type === 'object') walk(item.children, schemaPath)
    else if (item.type === 'array') walkItem(item.itemConfig, schemaPath)
  }
  walk(fields, '')
  return paths
}

/**
 * Removes a schema path (no row indices) from `values`, in every row of every
 * array along the way. Copies only what changes.
 */
export function omitSchemaPath<T>(value: T, schemaPath: string): T {
  const remove = (current: unknown, keys: string[]): unknown => {
    if (Array.isArray(current)) {
      return current.map((item: unknown) => remove(item, keys))
    }
    if (!isPlainObject(current) || !keys.length) return current
    const [head, ...rest] = keys
    if (!(head in current)) return current
    const next = { ...current }
    if (rest.length) next[head] = remove(current[head], rest)
    else delete next[head]
    return next
  }
  return remove(value, schemaPath.split('.')) as T
}

/**
 * Splits hidden fields by schema path into those hidden wherever they appear
 * (`everywhere`: outside arrays, or hidden in every row reached) and those
 * hidden in only some rows (`someRows`).
 */
export function splitHidden({ hidden, rowOccurrences }: Visibility): {
  everywhere: string[]
  someRows: string[]
} {
  const hiddenRows = new Map<string, number>()
  const everywhere = new Set<string>()
  for (const { path, schemaPath } of hidden) {
    if (path === schemaPath) everywhere.add(schemaPath)
    else hiddenRows.set(schemaPath, (hiddenRows.get(schemaPath) ?? 0) + 1)
  }
  const someRows: string[] = []
  for (const [schemaPath, count] of hiddenRows) {
    if (count === rowOccurrences.get(schemaPath)) everywhere.add(schemaPath)
    else someRows.push(schemaPath)
  }
  return { everywhere: [...everywhere], someRows }
}

/**
 * Whether row indices in `schemaPath` still identify the same rows in Zod's
 * output: false when a pipe/transform sits on the way down (it may reorder or
 * reshape rows), so output values must not be pruned by input row index.
 */
export function rowIndicesStable(
  schema: z.$ZodType,
  schemaPath: string,
): boolean {
  const segments = schemaPath.split('.')
  const visit = (node: z.$ZodType, index: number): boolean => {
    const def = node._zod.def as unknown as Def
    if (WRAPPERS_WITH_INNER.has(def.type)) {
      return visit(def.innerType as z.$ZodType, index)
    }
    // The leaf's own schema can't move rows; stop once the path is consumed
    if (index >= segments.length) return true
    if (def.type === 'pipe' || def.type === 'transform') return false
    // Arrays don't consume a segment (row indices aren't in schema paths)
    if (def.type === 'array') return visit(def.element as z.$ZodType, index)
    if (def.type === 'object') {
      const child = (def.shape as Record<string, z.$ZodType>)[segments[index]]
      return child ? visit(child, index + 1) : true
    }
    if (def.type === 'union') {
      return (def.options as z.$ZodType[]).every((o) => visit(o, index))
    }
    return true
  }
  return visit(schema, 0)
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
  // Copy property descriptors (not values): Zod defines e.g. `defaultValue`
  // as a getter that re-runs default suppliers on every parse
  const withDef = (changes: Record<string, unknown>) => {
    const next = Object.defineProperties(
      {},
      Object.getOwnPropertyDescriptors(def),
    ) as Record<string, unknown>
    for (const [key, value] of Object.entries(changes)) {
      Object.defineProperty(next, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true,
      })
    }
    return z.clone(schema, next as never)
  }

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

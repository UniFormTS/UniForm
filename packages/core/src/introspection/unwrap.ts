import * as z from 'zod/v4/core'
import type { FieldMeta } from '../types'

// ---------------------------------------------------------------------------
// Meta extraction — reads from z.globalRegistry (Zod v4)
// ---------------------------------------------------------------------------

/**
 * Reads UI metadata registered against a Zod schema via the Zod v4 global
 * registry (i.e. `.register(z.globalRegistry, { label: '...' })`).
 *
 * Returns an empty object when no metadata has been registered.
 *
 * @param schema - The Zod schema to read metadata from.
 */
export function extractMeta(schema: z.$ZodType): FieldMeta {
  return (z.globalRegistry.get(schema) ?? {}) as FieldMeta
}

// ---------------------------------------------------------------------------
// Unwrap transparent wrappers
// - optional / nullable / default / prefault: use def.innerType
// - pipe (from .transform()): use def.in (the source schema)
// ---------------------------------------------------------------------------

export type UnwrapResult = {
  schema: z.$ZodType
  required: boolean
  /** A wrapper accepts `undefined` (`optional`). */
  optional: boolean
  /** A wrapper accepts `null` (`nullable`). */
  nullable: boolean
  /**
   * Returns the outermost `default` / `prefault` value when it can seed the
   * input. Evaluated on each call, so default suppliers run every time.
   */
  getDefault?: () => unknown
  /**
   * The outermost default is an output-typed `.default()` (its inner schema
   * transforms), so the input must stay untouched for Zod to apply it.
   */
  deferredDefault: boolean
  meta: FieldMeta
}

/**
 * Whether `schema` (or anything nested in it) transforms its input, i.e. its
 * output type may differ from its input type.
 */
export function hasTransform(
  schema: z.$ZodType,
  seen: Set<z.$ZodType> = new Set(),
): boolean {
  if (seen.has(schema)) return false
  seen.add(schema)
  const def = schema._zod.def as unknown as Record<string, unknown> & {
    type: string
  }
  const check = (s: unknown): boolean =>
    s != null && typeof s === 'object' && '_zod' in s
      ? hasTransform(s as z.$ZodType, seen)
      : false

  switch (def.type) {
    case 'pipe':
    case 'transform':
      return true
    case 'object':
      return Object.values(def.shape as Record<string, unknown>).some(check)
    case 'array':
      return check(def.element)
    case 'union':
      return (def.options as unknown[]).some(check)
    case 'intersection':
      return check(def.left) || check(def.right)
    case 'tuple':
      return (def.items as unknown[]).some(check) || check(def.rest)
    case 'record':
      return check(def.valueType)
    case 'lazy':
      try {
        return check((def.getter as () => unknown)())
      } catch {
        return true
      }
    default:
      return check(def.innerType)
  }
}

const WRAPPER_KINDS = new Set([
  'optional',
  'nullable',
  'default',
  'prefault',
  'pipe', // ZodPipe — .transform() returns ZodPipe<Source, ZodTransform>
])

/**
 * Recursively strips transparent Zod wrapper types (`optional`, `nullable`,
 * `default`, `prefault`, `pipe`) from a schema, collecting metadata and
 * requiredness along the way.
 *
 * Also records whether the schema accepts `undefined` / `null` and how to get
 * the outermost `default` / `prefault` value. A `.default()` whose inner schema
 * transforms supplies an *output* value and is deferred instead (the field is
 * marked `optional` and `deferredDefault`).
 *
 * Metadata is merged so that outer wrappers take precedence over inner ones
 * (e.g. meta attached to the `optional()` call overrides meta on the inner
 * type).
 *
 * @param schema - The Zod schema to unwrap.
 * @returns The innermost non-wrapper schema together with its resolved
 *   `required` flag and merged `meta`.
 */
export function unwrap(schema: z.$ZodType): UnwrapResult {
  let inner = schema
  let required = true
  let optional = false
  let nullable = false
  let getDefault: UnwrapResult['getDefault']
  let deferredDefault = false
  let sawDefault = false
  let meta: FieldMeta = extractMeta(inner)

  let kind = inner._zod.def.type

  while (WRAPPER_KINDS.has(kind)) {
    if (kind === 'optional' || kind === 'nullable') {
      required = false
    }
    if (kind === 'optional') optional = true
    if (kind === 'nullable') nullable = true
    // Only the outermost default decides: it is what Zod applies to an
    // untouched (undefined) input.
    if ((kind === 'default' || kind === 'prefault') && !sawDefault) {
      sawDefault = true
      const def = inner._zod.def as z.$ZodDefaultDef | z.$ZodPrefaultDef
      if (kind === 'default' && hasTransform(def.innerType)) {
        // `.default()` supplies an *output* value; around a transform it can't
        // be fed back through the input. Leave the input undefined instead.
        deferredDefault = true
        optional = true
      } else {
        // `def.defaultValue` is a getter that re-runs default suppliers
        getDefault = () => def.defaultValue
      }
    }

    if (kind === 'pipe') {
      // ZodPipe: def.in is the source schema, def.out is ZodTransform
      inner = (inner._zod.def as z.$ZodPipeDef).in
    } else {
      // optional / nullable / default / prefault
      inner = (
        inner._zod.def as
          | z.$ZodOptionalDef
          | z.$ZodNullableDef
          | z.$ZodDefaultDef
          | z.$ZodPrefaultDef
      ).innerType
    }

    meta = { ...extractMeta(inner), ...meta } // outer meta takes precedence
    kind = inner._zod.def.type
  }

  return {
    schema: inner,
    required,
    optional,
    nullable,
    getDefault,
    deferredDefault,
    meta,
  }
}

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
  /** Present only when a `default` / `prefault` wrapper exists (outermost wins). */
  defaultValue?: { value: unknown }
  meta: FieldMeta
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
 * Also records whether the schema accepts `undefined` / `null` and the value
 * of the outermost `default` / `prefault` wrapper usable as an *input* value.
 * A `.default()` placed outside a pipe/transform supplies an output value and is
 * skipped (the field is then marked `optional`).
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
  let defaultValue: UnwrapResult['defaultValue']
  // A `.default()` value is an *output* value: it is only safe as the input's
  // initial value when no pipe/transform sits between it and the input type.
  let defaultIsOutput = false
  let meta: FieldMeta = extractMeta(inner)

  let kind = inner._zod.def.type

  while (WRAPPER_KINDS.has(kind)) {
    if (kind === 'optional' || kind === 'nullable') {
      required = false
    }
    if (kind === 'optional') optional = true
    if (kind === 'nullable') nullable = true
    if ((kind === 'default' || kind === 'prefault') && !defaultValue) {
      defaultValue = {
        value: (inner._zod.def as z.$ZodDefaultDef | z.$ZodPrefaultDef)
          .defaultValue,
      }
      defaultIsOutput = kind === 'default'
    }

    if (kind === 'pipe' && defaultValue && defaultIsOutput) {
      // The outer `.default()` supplies a transformed output value, which can't
      // be fed back through the input. Drop it and leave the input undefined
      // (the wrapper accepts `undefined` and applies the default on parse); an
      // inner input-typed default may still be picked up below.
      defaultValue = undefined
      defaultIsOutput = false
      optional = true
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

  return { schema: inner, required, optional, nullable, defaultValue, meta }
}

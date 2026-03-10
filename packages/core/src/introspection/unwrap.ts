import * as z from 'zod/v4'
import type { FieldMeta } from '../types'

// ---------------------------------------------------------------------------
// Meta extraction — reads from z.globalRegistry (Zod v4)
// ---------------------------------------------------------------------------

export function extractMeta(schema: z.ZodTypeAny): FieldMeta {
  return (z.globalRegistry.get(schema as never) as FieldMeta | undefined) ?? {}
}

// ---------------------------------------------------------------------------
// Unwrap transparent wrappers
// - optional / nullable / default / prefault: use def.innerType
// - pipe (from .transform()): use def.in (the source schema)
// ---------------------------------------------------------------------------

export type UnwrapResult = {
  schema: z.ZodTypeAny
  required: boolean
  meta: FieldMeta
}

const WRAPPER_KINDS = new Set([
  'optional',
  'nullable',
  'default',
  'prefault',
  'pipe', // ZodPipe — .transform() returns ZodPipe<Source, ZodTransform>
])

export function unwrap(schema: z.ZodTypeAny): UnwrapResult {
  let inner = schema
  let required = true
  let meta: FieldMeta = extractMeta(inner)

  let kind = inner._zod.def.type

  while (WRAPPER_KINDS.has(kind)) {
    if (kind === 'optional' || kind === 'nullable') {
      required = false
    }

    if (kind === 'pipe') {
      // ZodPipe: def.in is the source schema, def.out is ZodTransform
      inner = (inner._zod.def as z.core.$ZodPipeDef).in as z.ZodTypeAny
    } else {
      // optional / nullable / default / prefault
      inner = (
        inner._zod.def as
          | z.core.$ZodOptionalDef
          | z.core.$ZodNullableDef
          | z.core.$ZodDefaultDef
          | z.core.$ZodPrefaultDef
      ).innerType as z.ZodTypeAny
    }

    meta = { ...extractMeta(inner), ...meta } // outer meta takes precedence
    kind = inner._zod.def.type
  }

  return { schema: inner, required, meta }
}

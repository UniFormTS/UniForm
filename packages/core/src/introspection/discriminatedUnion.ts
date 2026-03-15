import * as z from 'zod/v4/core'
import type { FieldConfig, SelectOption } from '../types'
import { deriveLabel } from './deriveLabel'
import { introspectSchema } from './introspect'

// ---------------------------------------------------------------------------
// Discriminated union metadata helper (used by AutoForm for variant-swap)
// ---------------------------------------------------------------------------

/**
 * Extracts static metadata from a `ZodDiscriminatedUnion` schema:
 * the discriminator key, a map of discriminator-value → variant ZodObject,
 * and a pre-built `FieldConfig` for the discriminator select field.
 *
 * Used by `AutoForm` to reactively swap variant fields without flattening.
 */
export function parseDiscriminatedUnionMeta(schema: z.$ZodDiscriminatedUnion): {
  discriminatorKey: string
  variantMap: Map<string, z.$ZodObject>
  discriminatorField: FieldConfig
  firstVariant: z.$ZodObject
} {
  const def = schema._zod.def
  const discriminatorKey = def.discriminator
  const variants = def.options as z.$ZodObject[]

  const variantMap = new Map<string, z.$ZodObject>()
  const discriminatorOptions: SelectOption[] = []

  for (const variant of variants) {
    const shape = variant._zod.def.shape as Record<string, z.$ZodAny>
    const litDef = (shape[discriminatorKey] as unknown as z.$ZodLiteral)._zod
      .def as { values: unknown[] }
    const value = String(litDef.values[0])
    variantMap.set(value, variant)
    discriminatorOptions.push({
      label: value.charAt(0).toUpperCase() + value.slice(1),
      value,
    })
  }

  const discriminatorField: FieldConfig = {
    name: discriminatorKey,
    type: 'select',
    label: deriveLabel(discriminatorKey),
    required: true,
    meta: {},
    options: discriminatorOptions,
  }

  return {
    discriminatorKey,
    variantMap,
    discriminatorField,
    firstVariant: variants[0],
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper for top-level ZodDiscriminatedUnion schemas
// ---------------------------------------------------------------------------

/**
 * Flattens a `ZodDiscriminatedUnion` into a `FieldConfig[]` suitable for
 * `<AutoForm>`. The discriminator becomes a `select` field; each variant's
 * fields are included once (first-variant wins for duplicates) with a
 * `meta.condition` that shows them only when the discriminator matches their
 * variant's literal value.
 *
 * @param schema - The top-level discriminated union schema to introspect.
 */
export function introspectDiscriminatedUnionSchema(
  schema: z.$ZodDiscriminatedUnion,
): FieldConfig[] {
  const def = schema._zod.def
  const discriminatorKey = def.discriminator
  const variants = def.options as z.$ZodObject[]

  // Build discriminator as a select field
  const discriminatorOptions: SelectOption[] = []
  for (const variant of variants) {
    const shape = variant._zod.def.shape as Record<string, z.$ZodAny>
    const litDef = (shape[discriminatorKey] as unknown as z.$ZodLiteral)._zod
      .def as { values: unknown[] }
    const value = String(litDef.values[0])
    discriminatorOptions.push({
      label: value.charAt(0).toUpperCase() + value.slice(1),
      value,
    })
  }

  const discriminatorField: FieldConfig = {
    name: discriminatorKey,
    type: 'select',
    label: deriveLabel(discriminatorKey),
    required: true,
    meta: {},
    options: discriminatorOptions,
  }

  // Collect variant-specific fields with auto-conditions
  const fields: FieldConfig[] = [discriminatorField]
  const seen = new Set<string>([discriminatorKey])

  for (const variant of variants) {
    const shape = variant._zod.def.shape as Record<string, z.$ZodAny>
    const literalDef = (shape[discriminatorKey] as unknown as z.$ZodLiteral)
      ._zod.def as { values: unknown[] }
    const discriminatorValue = String(literalDef.values[0])

    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (seen.has(key)) continue
      seen.add(key)

      const base = introspectSchema(fieldSchema, key, '')
      fields.push({
        ...base,
        meta: {
          ...base.meta,
          condition: (values: Record<string, unknown>) =>
            values[discriminatorKey] === discriminatorValue,
        },
      })
    }
  }

  return fields
}

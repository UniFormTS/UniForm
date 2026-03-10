import * as z from 'zod/v4'
import type { FieldConfig, FieldMeta, FieldType, SelectOption } from '../types'
import { deriveLabel } from './deriveLabel'
import { unwrap } from './unwrap'

// ---------------------------------------------------------------------------
// Main introspection function
// ---------------------------------------------------------------------------

/**
 * Recursively introspects a Zod schema and returns a {@link FieldConfig}
 * describing the field's type, label, validation constraints, and UI metadata.
 *
 * Transparent wrappers (`optional`, `nullable`, `default`, `pipe`) are
 * unwrapped before inspection. Unknown/unsupported types fall back to
 * `type: 'unknown'` rather than throwing.
 *
 * @param schema - The Zod schema to introspect.
 * @param name - The field key within its parent object (used for label derivation).
 * @param parentPath - The dot-notated path of the parent (used to build `field.name`).
 */
export function introspectSchema(
  schema: z.ZodType,
  name: string = '',
  parentPath: string = '',
): FieldConfig {
  const path = parentPath && name ? `${parentPath}.${name}` : name || parentPath

  const { schema: inner, required, meta } = unwrap(schema)
  const mergedMeta: FieldMeta = { ...meta }
  const def = inner._zod.def
  const kind = def.type

  const label =
    typeof mergedMeta.label === 'string' ? mergedMeta.label : deriveLabel(name)

  let type: FieldType = 'unknown'
  let options: SelectOption[] | undefined
  let children: FieldConfig[] | undefined
  let itemConfig: FieldConfig | undefined
  let unionVariants: FieldConfig[] | undefined
  let discriminatorKey: string | undefined
  let minItems: number | undefined
  let maxItems: number | undefined

  // Never throw — unknown types gracefully return 'unknown'
  try {
    if (kind === 'string') {
      type = 'string'
      const stringDef = def as z.core.$ZodStringDef
      // Handle standalone format schemas: z.email(), z.url(), z.uuid()
      // These are ZodStringFormat types with def.format set directly.
      const defFormat = (def as z.core.$ZodStringFormatDef).format as
        | string
        | undefined
      if (defFormat === 'email') {
        mergedMeta['inputType'] = 'email'
      } else if (defFormat === 'url') {
        mergedMeta['inputType'] = 'url'
      } else if (defFormat === 'uuid') {
        mergedMeta['inputType'] = 'uuid'
      } else {
        // Handle chained format checks: z.string().email() etc.
        // v4 check shape: { check: 'string_format', format: 'email' | 'url' | 'uuid' | ... }
        const checks = stringDef.checks ?? []
        const hasFormat = (fmt: string) =>
          checks.some(
            (c) =>
              c._zod.def.check === 'string_format' &&
              (c._zod.def as z.core.$ZodCheckStringFormatDef).format === fmt,
          )
        if (hasFormat('email')) {
          mergedMeta['inputType'] = 'email'
        } else if (hasFormat('url')) {
          mergedMeta['inputType'] = 'url'
        } else if (hasFormat('uuid')) {
          mergedMeta['inputType'] = 'uuid'
        }
      }
    } else if (kind === 'number' || kind === 'int') {
      type = 'number'
      mergedMeta['inputType'] = 'number'
    } else if (kind === 'boolean') {
      type = 'boolean'
    } else if (kind === 'date') {
      type = 'date'
      mergedMeta['inputType'] = 'date'
    } else if (kind === 'enum') {
      // v4: both z.enum() and z.nativeEnum() use type === 'enum' with def.entries
      type = 'select'
      const entries = (def as z.core.$ZodEnumDef).entries as Record<
        string,
        string | number
      >
      options = Object.entries(entries)
        .filter(([key]) => isNaN(Number(key)))
        .map(([key, value]) => ({
          label:
            typeof value === 'string'
              ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
              : key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
          value,
        }))
    } else if (kind === 'object') {
      type = 'object'
      const shape = (inner as z.ZodObject<z.ZodRawShape>).shape
      children = Object.entries(shape).map(([key, fieldSchema]) =>
        introspectSchema(fieldSchema as z.ZodType, key, path),
      )
    } else if (kind === 'array') {
      type = 'array'
      const arrayDef = def as z.core.$ZodArrayDef
      const elementSchema = arrayDef.element as z.ZodTypeAny
      itemConfig = introspectSchema(elementSchema, '', '')
      // Extract min/max from array checks
      const checks = arrayDef.checks ?? []
      for (const check of checks) {
        const checkDef = check._zod.def as unknown as Record<string, unknown>
        if (
          checkDef.check === 'min_length' &&
          typeof checkDef.minimum === 'number'
        ) {
          minItems = checkDef.minimum
        }
        if (
          checkDef.check === 'max_length' &&
          typeof checkDef.maximum === 'number'
        ) {
          maxItems = checkDef.maximum
        }
      }
    } else if (kind === 'union') {
      type = 'union'
      const unionDef = def as
        | z.core.$ZodDiscriminatedUnionDef
        | z.core.$ZodUnionDef
      if ('discriminator' in unionDef) {
        // ZodDiscriminatedUnion: def.discriminator + def.options[]
        discriminatorKey = unionDef.discriminator
      }
      const variants = unionDef.options as z.ZodTypeAny[]
      unionVariants = variants.map((variant, i) =>
        introspectSchema(variant, String(i), path),
      )
    }
  } catch {
    type = 'unknown'
  }

  return {
    name: path,
    type,
    label,
    required,
    meta: mergedMeta,
    ...(options !== undefined && { options }),
    ...(children !== undefined && { children }),
    ...(itemConfig !== undefined && { itemConfig }),
    ...(unionVariants !== undefined && { unionVariants }),
    ...(discriminatorKey !== undefined && { discriminatorKey }),
    ...(minItems !== undefined && { minItems }),
    ...(maxItems !== undefined && { maxItems }),
  }
}

// ---------------------------------------------------------------------------
// Convenience wrapper for top-level ZodObject schemas
// ---------------------------------------------------------------------------

/**
 * Introspects all fields of a top-level `ZodObject` schema and returns an
 * ordered array of {@link FieldConfig} objects, one per key in `schema.shape`.
 *
 * This is the entry point used by `<AutoForm>` to derive the field list from
 * the provided schema.
 *
 * @param schema - The top-level `ZodObject` schema to introspect.
 */
export function introspectObjectSchema(
  schema: z.ZodObject<z.ZodRawShape>,
): FieldConfig[] {
  return Object.entries(schema.shape).map(([key, fieldSchema]) =>
    introspectSchema(fieldSchema as z.ZodType, key, ''),
  )
}

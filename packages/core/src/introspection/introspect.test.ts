import { describe, it, expect, assert } from 'vitest'
import * as z from 'zod/v4'
import {
  introspectSchema,
  introspectObjectSchema,
  parseDiscriminatedUnionMeta,
} from './introspect'

// ---------------------------------------------------------------------------
// 1. Scalar types
// ---------------------------------------------------------------------------

describe('scalar types', () => {
  it('produces type "string" for ZodString', () => {
    const result = introspectSchema(z.string(), 'name')
    expect(result.type).toBe('string')
    expect(result.name).toBe('name')
  })

  it('produces type "number" for ZodNumber', () => {
    const result = introspectSchema(z.number(), 'age')
    expect(result.type).toBe('number')
  })

  it('produces type "boolean" for ZodBoolean', () => {
    const result = introspectSchema(z.boolean(), 'active')
    expect(result.type).toBe('boolean')
  })

  it('produces type "date" for ZodDate', () => {
    const result = introspectSchema(z.date(), 'createdAt')
    expect(result.type).toBe('date')
  })
})

// ---------------------------------------------------------------------------
// 2. Optional and nullable
// ---------------------------------------------------------------------------

describe('optional and nullable', () => {
  it('produces required=false for ZodOptional', () => {
    const result = introspectSchema(z.string().optional(), 'nickname')
    expect(result.required).toBe(false)
    expect(result.type).toBe('string')
  })

  it('produces required=false for ZodNullable', () => {
    const result = introspectSchema(z.string().nullable(), 'middleName')
    expect(result.required).toBe(false)
  })

  it('produces required=false for optional number', () => {
    const result = introspectSchema(z.number().optional(), 'score')
    expect(result.required).toBe(false)
    expect(result.type).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// 3. ZodDefault
// ---------------------------------------------------------------------------

describe('ZodDefault', () => {
  it('unwraps ZodDefault and preserves the inner type', () => {
    const result = introspectSchema(z.string().default('hello'), 'greeting')
    expect(result.type).toBe('string')
    expect(result.name).toBe('greeting')
  })

  it('unwraps ZodDefault wrapping a number', () => {
    const result = introspectSchema(z.number().default(0), 'count')
    expect(result.type).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// 4. ZodEnum
// ---------------------------------------------------------------------------

describe('ZodEnum', () => {
  it('produces type "select" with correct options', () => {
    const result = introspectSchema(z.enum(['red', 'green', 'blue']), 'color')
    assert(result.type === 'select')
    expect(result.options).toBeDefined()
    expect(result.options).toHaveLength(3)
    expect(result.options.map((o) => o.value)).toEqual(['red', 'green', 'blue'])
    expect(result.options.find((o) => o.value === 'red')?.label).toBe('Red')
  })
})

// ---------------------------------------------------------------------------
// 5. ZodNativeEnum
// ---------------------------------------------------------------------------

describe('ZodNativeEnum', () => {
  it('produces type "select" and does not include reverse numeric mappings', () => {
    enum Direction {
      Up = 0,
      Down = 1,
      Left = 2,
      Right = 3,
    }

    const result = introspectSchema(z.nativeEnum(Direction), 'direction')
    assert(result.type === 'select')
    expect(result.options).toBeDefined()
    // Should have 4 entries (Up, Down, Left, Right) not 8
    expect(result.options).toHaveLength(4)
    const keys = result.options.map((o) => o.label)
    expect(keys).not.toContain('0')
    expect(keys).not.toContain('1')
    expect(keys).toContain('Up')
    expect(keys).toContain('Down')
  })

  it('works with string native enums', () => {
    enum Status {
      Active = 'active',
      Inactive = 'inactive',
    }

    const result = introspectSchema(z.nativeEnum(Status), 'status')
    assert(result.type === 'select')
    expect(result.options).toHaveLength(2)
    expect(result.options.map((o) => o.value)).toEqual(['active', 'inactive'])
  })
})

// ---------------------------------------------------------------------------
// 6. ZodObject
// ---------------------------------------------------------------------------

describe('ZodObject', () => {
  it('produces type "object" with correct children', () => {
    const schema = z.object({
      firstName: z.string(),
      age: z.number(),
    })
    const result = introspectSchema(schema, 'person')
    assert(result.type === 'object')
    expect(result.children).toHaveLength(2)

    const firstNameField = result.children.find(
      (c) => c.name === 'person.firstName',
    )
    expect(firstNameField).toBeDefined()
    expect(firstNameField?.type).toBe('string')

    const ageField = result.children.find((c) => c.name === 'person.age')
    expect(ageField).toBeDefined()
    expect(ageField?.type).toBe('number')
  })

  it('introspectObjectSchema returns top-level fields', () => {
    const schema = z.object({
      email: z.string().email(),
      name: z.string(),
    })
    const fields = introspectObjectSchema(schema)
    expect(fields).toHaveLength(2)
    expect(fields.map((f) => f.name)).toEqual(['email', 'name'])
  })
})

// ---------------------------------------------------------------------------
// 7. Nested ZodObject — dot-notated names
// ---------------------------------------------------------------------------

describe('nested ZodObject', () => {
  it('produces dot-notated names for deeply nested fields', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
      }),
    })

    const fields = introspectObjectSchema(schema)
    expect(fields[0].name).toBe('address')
    assert(fields[0].type === 'object')

    const streetField = fields[0].children.find(
      (c) => c.name === 'address.street',
    )
    expect(streetField).toBeDefined()
    expect(streetField?.type).toBe('string')

    const cityField = fields[0].children.find((c) => c.name === 'address.city')
    expect(cityField).toBeDefined()
  })

  it('handles three levels of nesting', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          bio: z.string(),
        }),
      }),
    })

    const fields = introspectObjectSchema(schema)
    assert(fields[0].type === 'object')
    const profileField = fields[0].children[0]
    expect(profileField?.name).toBe('user.profile')

    assert(profileField?.type === 'object')
    const bioField = profileField.children[0]
    expect(bioField?.name).toBe('user.profile.bio')
    expect(bioField?.type).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 8. ZodArray of scalars
// ---------------------------------------------------------------------------

describe('ZodArray', () => {
  it('produces type "array" with correct scalar itemConfig', () => {
    const result = introspectSchema(z.array(z.string()), 'tags')
    assert(result.type === 'array')
    expect(result.itemConfig).toBeDefined()
    expect(result.itemConfig.type).toBe('string')
  })

  it('produces type "array" of numbers', () => {
    const result = introspectSchema(z.array(z.number()), 'scores')
    assert(result.type === 'array')
    expect(result.itemConfig.type).toBe('number')
  })
})

// ---------------------------------------------------------------------------
// 9. ZodArray of objects
// ---------------------------------------------------------------------------

describe('ZodArray of objects', () => {
  it('itemConfig has type "object" with correct children', () => {
    const result = introspectSchema(
      z.array(
        z.object({
          id: z.number(),
          label: z.string(),
        }),
      ),
      'items',
    )
    assert(result.type === 'array')
    assert(result.itemConfig.type === 'object')
    expect(result.itemConfig.children).toHaveLength(2)

    const idField = result.itemConfig.children.find((c) => c.name === 'id')
    expect(idField?.type).toBe('number')

    const labelField = result.itemConfig.children.find(
      (c) => c.name === 'label',
    )
    expect(labelField?.type).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 10. ZodPipe / transform (v4: .transform() returns ZodPipe, not ZodEffects)
// ---------------------------------------------------------------------------

describe('ZodPipe / transform', () => {
  it('unwraps .refine() — refinements are inline in v4, inner type preserved', () => {
    const result = introspectSchema(
      z.string().refine((v) => v.length > 0),
      'field',
    )
    expect(result.type).toBe('string')
  })

  it('unwraps .transform() — follows ZodPipe.in to get the source type', () => {
    const result = introspectSchema(
      z.string().transform((v) => v.trim()),
      'field',
    )
    expect(result.type).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 11. Label derivation
// ---------------------------------------------------------------------------

describe('label derivation', () => {
  it('converts camelCase to title case', () => {
    const result = introspectSchema(z.string(), 'firstName')
    expect(result.label).toBe('First Name')
  })

  it('converts snake_case to title case', () => {
    const result = introspectSchema(z.string(), 'billing_address')
    expect(result.label).toBe('Billing Address')
  })

  it('handles single word', () => {
    const result = introspectSchema(z.string(), 'name')
    expect(result.label).toBe('Name')
  })

  it('handles consecutive uppercase (acronym-like)', () => {
    const result = introspectSchema(z.string(), 'phoneNumber')
    expect(result.label).toBe('Phone Number')
  })

  it('derives label from last segment of dot-notated name', () => {
    const schema = z.object({ firstName: z.string() })
    const fields = introspectObjectSchema(schema)
    expect(fields[0].label).toBe('First Name')
  })
})

// ---------------------------------------------------------------------------
// 12. Meta extraction
// ---------------------------------------------------------------------------

describe('meta extraction', () => {
  it('reflects label from .meta()', () => {
    const schema = z.string().meta({ label: 'Custom Label' })
    const result = introspectSchema(schema, 'field')
    expect(result.label).toBe('Custom Label')
    expect(result.meta.label).toBe('Custom Label')
  })

  it('reflects span and other meta fields', () => {
    const schema = z.string().meta({
      label: 'Email',
      span: 6,
      placeholder: 'Enter email',
    })
    const result = introspectSchema(schema, 'email')
    expect(result.meta.span).toBe(6)
    expect(result.meta.placeholder).toBe('Enter email')
  })
})

// ---------------------------------------------------------------------------
// 13. ZodDiscriminatedUnion
// ---------------------------------------------------------------------------

describe('ZodDiscriminatedUnion', () => {
  it('sets discriminatorKey correctly', () => {
    const schema = z.discriminatedUnion('type', [
      z.object({ type: z.literal('a'), valueA: z.string() }),
      z.object({ type: z.literal('b'), valueB: z.number() }),
    ])

    const result = introspectSchema(schema, 'shape')
    assert(result.type === 'union')
    expect(result.discriminatorKey).toBe('type')
    expect(result.unionVariants).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// 14. ZodString format checks
// ---------------------------------------------------------------------------

describe('ZodString checks', () => {
  it('sets inputType="email" in meta for z.string().email()', () => {
    const result = introspectSchema(z.string().email(), 'email')
    expect(result.type).toBe('string')
    expect(result.meta['inputType']).toBe('email')
  })

  it('sets inputType="url" for z.string().url()', () => {
    const result = introspectSchema(z.string().url(), 'website')
    expect(result.meta['inputType']).toBe('url')
  })

  it('sets inputType="uuid" for z.string().uuid()', () => {
    const result = introspectSchema(z.string().uuid(), 'id')
    expect(result.meta['inputType']).toBe('uuid')
  })

  it('does not set inputType for plain string', () => {
    const result = introspectSchema(z.string(), 'plain')
    expect(result.meta['inputType']).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 15. Deeply nested optional object
// ---------------------------------------------------------------------------

describe('deeply nested optional object', () => {
  it('correctly strips all wrappings', () => {
    const schema = z.object({
      profile: z
        .object({
          bio: z.string().optional(),
          age: z.number().nullable().default(null),
        })
        .optional(),
    })

    const fields = introspectObjectSchema(schema)
    const profileField = fields[0]

    expect(profileField.required).toBe(false)
    assert(profileField.type === 'object')
    expect(profileField.children).toHaveLength(2)

    const bioField = profileField.children.find((c) => c.name === 'profile.bio')
    expect(bioField?.type).toBe('string')
    expect(bioField?.required).toBe(false)

    const ageField = profileField.children.find((c) => c.name === 'profile.age')
    expect(ageField?.type).toBe('number')
    expect(ageField?.required).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 16. Array min/max constraints
// ---------------------------------------------------------------------------

describe('array min/max constraints', () => {
  it('extracts minItems from z.array().min()', () => {
    const result = introspectSchema(z.array(z.string()).min(2), 'tags')
    assert(result.type === 'array')
    expect(result.minItems).toBe(2)
    expect(result.maxItems).toBeUndefined()
  })

  it('extracts maxItems from z.array().max()', () => {
    const result = introspectSchema(z.array(z.string()).max(10), 'tags')
    assert(result.type === 'array')
    expect(result.maxItems).toBe(10)
    expect(result.minItems).toBeUndefined()
  })

  it('extracts both minItems and maxItems', () => {
    const result = introspectSchema(
      z
        .array(z.object({ name: z.string() }))
        .min(1)
        .max(3),
      'items',
    )
    assert(result.type === 'array')
    expect(result.minItems).toBe(1)
    expect(result.maxItems).toBe(3)
  })

  it('has no minItems/maxItems for unconstrained arrays', () => {
    const result = introspectSchema(z.array(z.string()), 'tags')
    assert(result.type === 'array')
    expect(result.minItems).toBeUndefined()
    expect(result.maxItems).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// 17. parseDiscriminatedUnionMeta
// ---------------------------------------------------------------------------

describe('parseDiscriminatedUnionMeta', () => {
  const union = z.discriminatedUnion('channel', [
    z.object({ channel: z.literal('email'), recipientEmail: z.string() }),
    z.object({ channel: z.literal('sms'), phoneNumber: z.string() }),
    z.object({ channel: z.literal('webhook'), endpointUrl: z.string() }),
  ])

  it('returns the correct discriminatorKey', () => {
    const meta = parseDiscriminatedUnionMeta(union)
    expect(meta.discriminatorKey).toBe('channel')
  })

  it('builds the discriminator as a select field with one option per variant', () => {
    const meta = parseDiscriminatedUnionMeta(union)
    const field = meta.discriminatorField
    assert(field.type === 'select')
    expect(field.name).toBe('channel')
    expect(field.required).toBe(true)
    expect(field.options).toHaveLength(3)
    expect(field.options.map((o) => o.value)).toEqual([
      'email',
      'sms',
      'webhook',
    ])
  })

  it('capitalises option labels from the literal values', () => {
    const meta = parseDiscriminatedUnionMeta(union)
    const field = meta.discriminatorField
    assert(field.type === 'select')
    expect(field.options[0].label).toBe('Email')
    expect(field.options[1].label).toBe('Sms')
  })

  it('populates variantMap with an entry for every discriminator value', () => {
    const meta = parseDiscriminatedUnionMeta(union)
    expect(meta.variantMap.size).toBe(3)
    expect(meta.variantMap.has('email')).toBe(true)
    expect(meta.variantMap.has('sms')).toBe(true)
    expect(meta.variantMap.has('webhook')).toBe(true)
  })

  it('each variantMap entry is the matching ZodObject', () => {
    const meta = parseDiscriminatedUnionMeta(union)
    const emailVariant = meta.variantMap.get('email')!
    const shape = emailVariant._zod.def.shape as Record<string, unknown>
    expect(Object.keys(shape)).toContain('recipientEmail')
    expect(Object.keys(shape)).not.toContain('phoneNumber')
  })

  it('sets firstVariant to the first option in the union', () => {
    const meta = parseDiscriminatedUnionMeta(union)
    expect(meta.firstVariant).toBe(union._zod.def.options[0])
  })
})

import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectSchema, introspectObjectSchema } from './introspect'

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
    expect(result.type).toBe('object')
    expect(result.children).toHaveLength(2)

    const firstNameField = result.children?.find(
      (c) => c.name === 'person.firstName',
    )
    expect(firstNameField).toBeDefined()
    expect(firstNameField?.type).toBe('string')

    const ageField = result.children?.find((c) => c.name === 'person.age')
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
    expect(fields[0].type).toBe('object')

    const streetField = fields[0].children?.find(
      (c) => c.name === 'address.street',
    )
    expect(streetField).toBeDefined()
    expect(streetField?.type).toBe('string')

    const cityField = fields[0].children?.find((c) => c.name === 'address.city')
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
    const profileField = fields[0].children?.[0]
    expect(profileField?.name).toBe('user.profile')

    const bioField = profileField?.children?.[0]
    expect(bioField?.name).toBe('user.profile.bio')
    expect(bioField?.type).toBe('string')
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

    expect(profileField.type).toBe('object')
    expect(profileField.required).toBe(false)
    expect(profileField.children).toHaveLength(2)

    const bioField = profileField.children?.find(
      (c) => c.name === 'profile.bio',
    )
    expect(bioField?.type).toBe('string')
    expect(bioField?.required).toBe(false)

    const ageField = profileField.children?.find(
      (c) => c.name === 'profile.age',
    )
    expect(ageField?.type).toBe('number')
    expect(ageField?.required).toBe(false)
  })
})

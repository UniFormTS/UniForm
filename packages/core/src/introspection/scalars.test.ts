import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectSchema, introspectObjectSchema } from './introspect'

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

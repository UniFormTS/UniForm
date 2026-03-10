import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectSchema } from './introspect'

// ---------------------------------------------------------------------------
// 8. ZodArray of scalars
// ---------------------------------------------------------------------------

describe('ZodArray', () => {
  it('produces type "array" with correct scalar itemConfig', () => {
    const result = introspectSchema(z.array(z.string()), 'tags')
    expect(result.type).toBe('array')
    expect(result.itemConfig).toBeDefined()
    expect(result.itemConfig?.type).toBe('string')
  })

  it('produces type "array" of numbers', () => {
    const result = introspectSchema(z.array(z.number()), 'scores')
    expect(result.type).toBe('array')
    expect(result.itemConfig?.type).toBe('number')
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
    expect(result.type).toBe('array')
    expect(result.itemConfig?.type).toBe('object')
    expect(result.itemConfig?.children).toHaveLength(2)

    const idField = result.itemConfig?.children?.find((c) => c.name === 'id')
    expect(idField?.type).toBe('number')

    const labelField = result.itemConfig?.children?.find(
      (c) => c.name === 'label',
    )
    expect(labelField?.type).toBe('string')
  })
})

// ---------------------------------------------------------------------------
// 16. Array min/max constraints
// ---------------------------------------------------------------------------

describe('array min/max constraints', () => {
  it('extracts minItems from z.array().min()', () => {
    const result = introspectSchema(z.array(z.string()).min(2), 'tags')
    expect(result.type).toBe('array')
    expect(result.minItems).toBe(2)
    expect(result.maxItems).toBeUndefined()
  })

  it('extracts maxItems from z.array().max()', () => {
    const result = introspectSchema(z.array(z.string()).max(10), 'tags')
    expect(result.type).toBe('array')
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
    expect(result.type).toBe('array')
    expect(result.minItems).toBe(1)
    expect(result.maxItems).toBe(3)
  })

  it('has no minItems/maxItems for unconstrained arrays', () => {
    const result = introspectSchema(z.array(z.string()), 'tags')
    expect(result.type).toBe('array')
    expect(result.minItems).toBeUndefined()
    expect(result.maxItems).toBeUndefined()
  })
})

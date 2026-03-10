import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectSchema } from './introspect'

// ---------------------------------------------------------------------------
// 4. ZodEnum
// ---------------------------------------------------------------------------

describe('ZodEnum', () => {
  it('produces type "select" with correct options', () => {
    const result = introspectSchema(z.enum(['red', 'green', 'blue']), 'color')
    expect(result.type).toBe('select')
    expect(result.options).toBeDefined()
    expect(result.options).toHaveLength(3)
    expect(result.options?.map((o) => o.value)).toEqual([
      'red',
      'green',
      'blue',
    ])
    expect(result.options?.find((o) => o.value === 'red')?.label).toBe('Red')
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
    expect(result.type).toBe('select')
    expect(result.options).toBeDefined()
    // Should have 4 entries (Up, Down, Left, Right) not 8
    expect(result.options).toHaveLength(4)
    const keys = result.options!.map((o) => o.label)
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
    expect(result.type).toBe('select')
    expect(result.options).toHaveLength(2)
    expect(result.options?.map((o) => o.value)).toEqual(['active', 'inactive'])
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
    expect(result.type).toBe('union')
    expect(result.discriminatorKey).toBe('type')
    expect(result.unionVariants).toHaveLength(2)
  })
})

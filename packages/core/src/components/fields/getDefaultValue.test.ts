import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectSchema } from '../../introspection/introspect'
import { getDefaultValue, getEmptyValue } from './getDefaultValue'

const field = (schema: z.ZodType, name = 'f') => introspectSchema(schema, name)

describe('getDefaultValue', () => {
  it('returns type defaults for required scalars', () => {
    expect(getDefaultValue(field(z.string()))).toBe('')
    expect(getDefaultValue(field(z.boolean()))).toBe(false)
    expect(getDefaultValue(field(z.number()))).toBeUndefined()
    expect(getDefaultValue(field(z.date()))).toBeUndefined()
    expect(getDefaultValue(field(z.enum(['red', 'blue'])))).toBe('red')
    expect(getDefaultValue(field(z.array(z.string())))).toEqual([])
  })

  it('prefers the schema default value', () => {
    expect(getDefaultValue(field(z.string().default('hi')))).toBe('hi')
    expect(getDefaultValue(field(z.number().default(5)))).toBe(5)
    expect(getDefaultValue(field(z.boolean().default(true)))).toBe(true)
    expect(getDefaultValue(field(z.enum(['a', 'b']).default('b')))).toBe('b')
    expect(getDefaultValue(field(z.array(z.string()).default(['x'])))).toEqual([
      'x',
    ])
  })

  it('uses undefined for empty optional text-like fields', () => {
    expect(
      getDefaultValue(field(z.string().email().optional())),
    ).toBeUndefined()
    expect(getDefaultValue(field(z.number().optional()))).toBeUndefined()
  })

  it('uses null for empty nullable (non-optional) text-like fields', () => {
    expect(getDefaultValue(field(z.string().nullable()))).toBeNull()
    expect(getDefaultValue(field(z.number().nullable()))).toBeNull()
  })

  it('keeps the first option for optional selects (no empty option to show)', () => {
    expect(getDefaultValue(field(z.enum(['a', 'b']).optional()))).toBe('a')
  })

  it('recurses into nested objects at any depth', () => {
    const f = field(
      z.object({
        news: z.boolean(),
        color: z.enum(['red', 'blue']),
        inner: z.object({ deep: z.boolean(), label: z.string().default('x') }),
      }),
      'prefs',
    )
    expect(getDefaultValue(f)).toEqual({
      news: false,
      color: 'red',
      inner: { deep: false, label: 'x' },
    })
  })
})

describe('getEmptyValue', () => {
  it('maps empty input to the value the schema accepts as "empty"', () => {
    expect(getEmptyValue(field(z.string()))).toBe('')
    expect(getEmptyValue(field(z.string().optional()))).toBeUndefined()
    expect(getEmptyValue(field(z.string().nullable()))).toBeNull()
    expect(getEmptyValue(field(z.string().nullish()))).toBeUndefined()
    expect(getEmptyValue(field(z.number()))).toBeUndefined()
  })
})

import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectSchema } from '../../introspection/introspect'
import { getDefaultValue, getEmptyValue } from './getDefaultValue'

const field = (schema: z.ZodType, name = 'f') => introspectSchema(schema, name)

describe('getDefaultValue', () => {
  it('returns form-state empty values for scalars', () => {
    // Text-like inputs hold '' in form state; the resolver maps '' to the
    // schema's empty value (see normalizeEmptyValues) before validation.
    expect(getDefaultValue(field(z.string()))).toBe('')
    expect(getDefaultValue(field(z.number()))).toBe('')
    expect(getDefaultValue(field(z.date()))).toBe('')
    expect(getDefaultValue(field(z.string().email().optional()))).toBe('')
    expect(getDefaultValue(field(z.number().nullable()))).toBe('')
    expect(getDefaultValue(field(z.boolean()))).toBe(false)
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

  it('runs a default supplier for every generated value', () => {
    let n = 0
    const f = field(z.string().default(() => `id-${++n}`))
    expect(getDefaultValue(f)).toBe('id-1')
    expect(getDefaultValue(f)).toBe('id-2')
  })

  it('leaves non-text fields with a deferred (output) default undefined', () => {
    expect(
      getDefaultValue(
        field(
          z
            .boolean()
            .transform((b) => !b)
            .default(false),
        ),
      ),
    ).toBeUndefined()
    // Composites are seeded from their children's own defaults, so every
    // sibling holds a valid input; untouched-ness is detected on submit.
    expect(
      getDefaultValue(
        field(
          z
            .object({
              len: z.string().transform((s) => s.length),
              flag: z.boolean(),
            })
            .default({ len: 5, flag: true }),
        ),
      ),
    ).toEqual({ len: '', flag: false })
    // Text inputs still hold '' (mapped to undefined on submit)
    expect(
      getDefaultValue(
        field(
          z
            .string()
            .transform((s) => s.length)
            .default(5),
        ),
      ),
    ).toBe('')
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

  it("treats an inconclusive (async) probe as accepting ''", () => {
    expect(
      getEmptyValue(
        field(z.number().or(z.literal('').refine(() => Promise.resolve(true)))),
      ),
    ).toBe('')
  })
})

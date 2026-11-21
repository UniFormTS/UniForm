import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectObjectSchema } from '../introspection/introspect'
import { normalizeEmptyValues } from './normalizeEmptyValues'

const fieldsOf = (shape: z.ZodRawShape) =>
  introspectObjectSchema(z.object(shape) as never)

describe('normalizeEmptyValues', () => {
  it("maps '' to each text-like field's empty value", () => {
    const fields = fieldsOf({
      req: z.string(),
      opt: z.string().optional(),
      nul: z.string().nullable(),
      num: z.number(),
      blank: z.number().or(z.literal('')),
      flag: z.boolean(),
    })
    expect(
      normalizeEmptyValues(
        { req: '', opt: '', nul: '', num: '', blank: '', flag: false },
        fields,
      ),
    ).toEqual({
      req: '',
      opt: undefined,
      nul: null,
      num: undefined,
      blank: '',
      flag: false,
    })
  })

  it('leaves non-empty values untouched', () => {
    const fields = fieldsOf({ opt: z.string().optional(), num: z.number() })
    expect(normalizeEmptyValues({ opt: 'x', num: 3 }, fields)).toEqual({
      opt: 'x',
      num: 3,
    })
  })

  it('recurses into nested objects and array rows', () => {
    const fields = fieldsOf({
      a: z.object({ b: z.object({ c: z.string().optional() }) }),
      rows: z.array(z.object({ note: z.string().nullable() })),
      nums: z.array(z.number().optional()),
    })
    expect(
      normalizeEmptyValues(
        {
          a: { b: { c: '' } },
          rows: [{ note: '' }, { note: 'x' }],
          nums: ['', 1],
        },
        fields,
      ),
    ).toEqual({
      a: { b: { c: undefined } },
      rows: [{ note: null }, { note: 'x' }],
      nums: [undefined, 1],
    })
  })

  it('drops an untouched composite with a deferred default so Zod applies it', () => {
    const fields = fieldsOf({
      o: z
        .object({ len: z.string().transform((s) => s.length) })
        .default({ len: 5 }),
    })
    expect(normalizeEmptyValues({ o: { len: '' } }, fields)).toEqual({
      o: undefined,
    })
    expect(normalizeEmptyValues({ o: { len: 'abc' } }, fields)).toEqual({
      o: { len: 'abc' },
    })
  })

  it('compares raw values (before nullable mapping) to detect untouched composites', () => {
    const fields = fieldsOf({
      o: z
        .object({
          len: z.string().transform((s) => s.length),
          note: z.string().nullable(),
          flag: z.boolean(),
        })
        .default({ len: 5, note: null, flag: true }),
    })
    expect(
      normalizeEmptyValues({ o: { len: '', note: '', flag: false } }, fields),
    ).toEqual({ o: undefined })
    // Any change from the seeded defaults keeps the composite
    expect(
      normalizeEmptyValues({ o: { len: '', note: '', flag: true } }, fields),
    ).toEqual({ o: { len: '', note: null, flag: true } })
  })

  it('passes through keys without a field config', () => {
    expect(normalizeEmptyValues({ extra: '' }, [])).toEqual({ extra: '' })
  })

  it('does not mutate its input', () => {
    const values = { a: { c: '' } }
    normalizeEmptyValues(
      values,
      fieldsOf({ a: z.object({ c: z.string().optional() }) }),
    )
    expect(values).toEqual({ a: { c: '' } })
  })
})

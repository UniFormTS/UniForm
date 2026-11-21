import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { safeParse } from 'zod/v4/core'
import { introspectObjectSchema } from '../introspection/introspect'
import { applyFieldOverrides } from './fieldPipeline'
import {
  collectHiddenPaths,
  omitPaths,
  relaxSchemaAt,
  toSchemaPath,
} from './hiddenFields'

const fieldsOf = (
  schema: z.ZodObject,
  overrides: Record<string, Record<string, unknown>> = {},
) => applyFieldOverrides(introspectObjectSchema(schema as never), overrides)

describe('collectHiddenPaths', () => {
  it('collects fields hidden by meta or by a false condition', () => {
    const fields = fieldsOf(
      z.object({ a: z.string(), b: z.string(), c: z.boolean() }),
      {
        a: { hidden: true },
        b: { condition: (v: Record<string, unknown>) => v.c === true },
      },
    )
    expect(collectHiddenPaths(fields, { a: '', b: '', c: false })).toEqual([
      'a',
      'b',
    ])
    expect(collectHiddenPaths(fields, { a: '', b: '', c: true })).toEqual(['a'])
  })

  it('stops at a hidden parent and evaluates nested conditions with full values', () => {
    const fields = fieldsOf(
      z.object({
        p: z.object({ x: z.string(), y: z.string() }),
        q: z.object({ z: z.string() }),
      }),
      {
        p: { hidden: true },
        'q.z': { condition: (v: Record<string, unknown>) => v.flag === 1 },
      },
    )
    expect(collectHiddenPaths(fields, { p: {}, q: { z: '' } })).toEqual([
      'p',
      'q.z',
    ])
  })

  it('evaluates array row conditions per row with row values', () => {
    const fields = fieldsOf(
      z.object({
        rows: z.array(z.object({ kind: z.string(), note: z.string() })),
      }),
      {
        'rows.note': {
          condition: (row: Record<string, unknown>) => row.kind === 'b',
        },
      },
    )
    expect(
      collectHiddenPaths(fields, {
        rows: [
          { kind: 'a', note: '' },
          { kind: 'b', note: '' },
          { kind: 'a', note: '' },
        ],
      }),
    ).toEqual(['rows.0.note', 'rows.2.note'])
  })

  it('applies per-row dynamic hidden meta', () => {
    const [rows] = fieldsOf(
      z.object({ rows: z.array(z.object({ a: z.string() })) }),
    )
    const withRowMeta = { ...rows, _rowDynamicMeta: { 1: { a: { hidden: true } } } }
    expect(
      collectHiddenPaths([withRowMeta], { rows: [{ a: '' }, { a: '' }] }),
    ).toEqual(['rows.1.a'])
  })

  it('treats a throwing condition as visible', () => {
    const fields = fieldsOf(z.object({ a: z.string() }), {
      a: {
        condition: () => {
          throw new Error('boom')
        },
      },
    })
    expect(collectHiddenPaths(fields, { a: '' })).toEqual([])
  })
})

describe('omitPaths', () => {
  it('removes nested and array-row paths without mutating the input', () => {
    const values = {
      a: 1,
      p: { x: 1, y: 2 },
      rows: [
        { k: 'a', n: '' },
        { k: 'b', n: 'x' },
      ],
    }
    const result = omitPaths(values, ['p.x', 'rows.0.n', 'missing.path'])
    expect(result).toEqual({
      a: 1,
      p: { y: 2 },
      rows: [{ k: 'a' }, { k: 'b', n: 'x' }],
    })
    expect(values.p).toEqual({ x: 1, y: 2 })
    expect(values.rows[0]).toEqual({ k: 'a', n: '' })
  })

  it('removes a whole array element value when the path ends at the index', () => {
    expect(omitPaths({ tags: ['a', 'b'] }, ['tags.1'])).toEqual({
      tags: ['a', undefined],
    })
  })
})

describe('toSchemaPath', () => {
  it('drops array indices', () => {
    expect(toSchemaPath('rows.12.note')).toBe('rows.note')
    expect(toSchemaPath('a.b')).toBe('a.b')
  })
})

describe('relaxSchemaAt', () => {
  it('makes the given paths optional, through wrappers, arrays and unions', () => {
    const schema = z.object({
      a: z.string().min(1),
      p: z.object({ x: z.string().min(1), y: z.string() }).optional(),
      rows: z.array(z.object({ n: z.string().min(1), k: z.string() })),
      t: z.string().transform((s) => s.length),
    })
    const relaxed = relaxSchemaAt(schema, ['a', 'p.x', 'rows.n'])
    const result = safeParse(relaxed, {
      p: { y: '' },
      rows: [{ k: 'k' }],
      t: 'abc',
    })
    expect(result.success).toBe(true)
    expect(result.data).toEqual({ p: { y: '' }, rows: [{ k: 'k' }], t: 3 })
    // Other constraints still apply
    expect(safeParse(relaxed, { p: { y: 1 }, rows: [], t: 'a' }).success).toBe(
      false,
    )
  })

  it('relaxes matching keys in every discriminated union variant', () => {
    const schema = z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('a'), note: z.string().min(1) }),
      z.strictObject({ kind: z.literal('b'), other: z.string() }),
    ])
    const relaxed = relaxSchemaAt(schema, ['note'])
    expect(safeParse(relaxed, { kind: 'a' }).success).toBe(true)
    expect(safeParse(relaxed, { kind: 'b' }).success).toBe(false)
  })

  it('returns the original schema when nothing needs relaxing', () => {
    const schema = z.object({ a: z.string() })
    expect(relaxSchemaAt(schema, [])).toBe(schema)
  })
})

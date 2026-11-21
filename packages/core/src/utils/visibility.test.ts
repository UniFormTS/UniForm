import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { introspectObjectSchema } from '../introspection/introspect'
import type { FieldCondition, FieldConfig } from '../types'
import { buildVisibilityFields } from './fieldPipeline'
import { isFieldHidden } from './hiddenFields'

const fields = () =>
  introspectObjectSchema(
    z.object({
      a: z.string(),
      b: z.string(),
      c: z.string(),
      rows: z.array(z.object({ x: z.string() })),
    }) as never,
  )

describe('buildVisibilityFields', () => {
  it('applies overrides, then conditions, then dynamic meta', () => {
    const conditions = new Map<string, FieldCondition>([['b', () => false]])
    const result = buildVisibilityFields(
      fields(),
      { a: { hidden: true }, b: { condition: () => true } },
      conditions,
      { c: { hidden: true }, 'rows.1.x': { hidden: true } },
    )
    const byName = Object.fromEntries(result.map((f) => [f.name, f]))
    expect(byName.a.meta.hidden).toBe(true)
    // UniForm conditions win over the fields-prop condition
    expect(byName.b.meta.condition?.({})).toBe(false)
    expect(byName.c.meta.hidden).toBe(true)
    // Row-indexed dynamic meta is attached for the array renderer
    expect(
      (byName.rows as FieldConfig & { _rowDynamicMeta?: unknown })
        ._rowDynamicMeta,
    ).toEqual({ 1: { x: { hidden: true } } })
  })
})

describe('isFieldHidden', () => {
  const [a] = fields()
  it('is true for meta.hidden or a false condition', () => {
    expect(isFieldHidden({ ...a, meta: { hidden: true } }, {})).toBe(true)
    expect(isFieldHidden({ ...a, meta: { condition: () => false } }, {})).toBe(
      true,
    )
    expect(isFieldHidden({ ...a, meta: { condition: () => true } }, {})).toBe(
      false,
    )
    expect(isFieldHidden(a, {})).toBe(false)
  })
  it('passes the given values to the condition and lets errors propagate', () => {
    const seen: unknown[] = []
    isFieldHidden(
      {
        ...a,
        meta: {
          condition: (v) => {
            seen.push(v)
            return true
          },
        },
      },
      { k: 1 },
    )
    expect(seen).toEqual([{ k: 1 }])
    expect(() =>
      isFieldHidden(
        {
          ...a,
          meta: {
            condition: () => {
              throw new Error('boom')
            },
          },
        },
        {},
      ),
    ).toThrow('boom')
  })
  it('does not treat render: false as hidden', () => {
    expect(isFieldHidden({ ...a, meta: { render: false } }, {})).toBe(false)
  })
})

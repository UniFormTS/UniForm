import { describe, it, expect } from 'vitest'
import * as z from 'zod/v4'
import { unwrap, extractMeta } from './unwrap'

describe('unwrap', () => {
  // ---------------------------------------------------------------------------
  // Plain (non-wrapper) schemas — identity pass-through
  // ---------------------------------------------------------------------------

  it('returns the same schema when there are no wrappers', () => {
    const schema = z.string()
    const { schema: inner, required } = unwrap(schema)
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(true)
  })

  it('preserves required=true for a bare string', () => {
    const { required } = unwrap(z.string())
    expect(required).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // optional
  // ---------------------------------------------------------------------------

  it('unwraps ZodOptional and sets required=false', () => {
    const { schema: inner, required } = unwrap(z.string().optional())
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(false)
  })

  it('unwraps deeply optional (optional on an object)', () => {
    const { schema: inner, required } = unwrap(
      z.object({ x: z.number() }).optional(),
    )
    expect(inner._zod.def.type).toBe('object')
    expect(required).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // nullable
  // ---------------------------------------------------------------------------

  it('unwraps ZodNullable and sets required=false', () => {
    const { schema: inner, required } = unwrap(z.string().nullable())
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // default
  // ---------------------------------------------------------------------------

  it('unwraps ZodDefault and keeps required=true', () => {
    // A field with a default is still "required" from a type-system point of
    // view — the default just provides a fallback value.
    const { schema: inner, required } = unwrap(z.string().default('hello'))
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(true)
  })

  it('unwraps ZodDefault wrapping a number', () => {
    const { schema: inner } = unwrap(z.number().default(0))
    expect(inner._zod.def.type).toBe('number')
  })

  // ---------------------------------------------------------------------------
  // pipe / transform
  // ---------------------------------------------------------------------------

  it('unwraps ZodPipe produced by .transform() and returns the source type', () => {
    const { schema: inner, required } = unwrap(
      z.string().transform((v) => v.trim()),
    )
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // Stacked wrappers
  // ---------------------------------------------------------------------------

  it('unwraps nullable + default stack', () => {
    const { schema: inner, required } = unwrap(
      z.number().nullable().default(null),
    )
    expect(inner._zod.def.type).toBe('number')
    expect(required).toBe(false)
  })

  it('unwraps optional + default stack', () => {
    const { schema: inner, required } = unwrap(
      z.string().optional().default(''),
    )
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(false)
  })

  it('unwraps optional wrapping a transformed string', () => {
    const { schema: inner, required } = unwrap(
      z
        .string()
        .transform((v) => v.trim())
        .optional(),
    )
    expect(inner._zod.def.type).toBe('string')
    expect(required).toBe(false)
  })

  // ---------------------------------------------------------------------------
  // Meta extraction & merging
  // ---------------------------------------------------------------------------

  it('picks up meta from the innermost schema', () => {
    const schema = z.string().meta({ label: 'Inner Label' })
    const { meta } = unwrap(schema)
    expect(meta.label).toBe('Inner Label')
  })

  it('outer wrapper meta overrides inner schema meta', () => {
    const inner = z.string().meta({ label: 'Inner' })
    const outer = inner.optional().register(z.globalRegistry, {
      label: 'Outer',
    })
    const { meta } = unwrap(outer)
    expect(meta.label).toBe('Outer')
  })

  it('merges meta — outer keys win, inner-only keys are preserved', () => {
    const inner = z.string().meta({ label: 'Inner', placeholder: 'Type here' })
    const outer = inner
      .optional()
      .register(z.globalRegistry, { label: 'Outer' })
    const { meta } = unwrap(outer)
    expect(meta.label).toBe('Outer')
    expect(meta.placeholder).toBe('Type here')
  })
})

// ---------------------------------------------------------------------------
// extractMeta
// ---------------------------------------------------------------------------

describe('extractMeta', () => {
  it('returns an empty object when no metadata is registered', () => {
    expect(extractMeta(z.string())).toEqual({})
  })

  it('returns the registered metadata', () => {
    const schema = z.string().meta({ label: 'My Field', span: 6 })
    const meta = extractMeta(schema)
    expect(meta.label).toBe('My Field')
    expect(meta.span).toBe(6)
  })
})

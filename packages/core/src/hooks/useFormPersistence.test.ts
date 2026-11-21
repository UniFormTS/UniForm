import { describe, it, expect } from 'vitest'
import { serializeDraft, mergeDraft } from './useFormPersistence'

const roundTrip = (
  base: Record<string, unknown>,
  values: Record<string, unknown>,
) =>
  mergeDraft(
    base,
    JSON.parse(serializeDraft(values)) as Record<string, unknown>,
  )

describe('draft serialization', () => {
  it('restores cleared (undefined) values instead of the defaults', () => {
    const restored = roundTrip(
      { email: 'old@example.com', nested: { note: 'x', other: 1 } },
      { email: undefined, nested: { note: undefined } },
    )
    expect(restored).toEqual({
      email: undefined,
      nested: { note: undefined, other: 1 },
    })
    expect('email' in restored).toBe(true)
  })

  it('keeps undefined array elements', () => {
    expect(roundTrip({}, { scores: [1, undefined, 3] })).toEqual({
      scores: [1, undefined, 3],
    })
  })

  it('replaces a default object with a cleared value', () => {
    expect(roundTrip({ prefs: { a: 1 } }, { prefs: undefined })).toEqual({
      prefs: undefined,
    })
  })

  it('restores drafts written before markers existed', () => {
    expect(mergeDraft({ a: 'd', b: { c: 1, d: 2 } }, { b: { c: 5 } })).toEqual({
      a: 'd',
      b: { c: 5, d: 2 },
    })
  })
})

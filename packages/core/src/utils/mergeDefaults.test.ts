import { describe, it, expect } from 'vitest'
import { mergeDefaults } from './mergeDefaults'

describe('mergeDefaults', () => {
  it('recursively merges plain objects, source winning', () => {
    expect(
      mergeDefaults(
        { a: '', nested: { x: false, y: 'red', deep: { z: 1 } } },
        { nested: { x: true, deep: { w: 2 } } },
      ),
    ).toEqual({ a: '', nested: { x: true, y: 'red', deep: { z: 1, w: 2 } } })
  })

  it('replaces arrays, dates and primitives instead of merging them', () => {
    const date = new Date(0)
    expect(
      mergeDefaults(
        { list: [1, 2], when: new Date(1), n: 1 },
        {
          list: [3],
          when: date,
          n: 2,
        },
      ),
    ).toEqual({ list: [3], when: date, n: 2 })
  })

  it('keeps the base value when the source value is undefined', () => {
    expect(mergeDefaults({ a: 'x' }, { a: undefined })).toEqual({ a: 'x' })
  })

  it('lets null override', () => {
    expect(mergeDefaults({ a: { b: 1 } }, { a: null })).toEqual({ a: null })
  })

  it('does not mutate its inputs', () => {
    const base = { nested: { x: 1 } }
    mergeDefaults(base, { nested: { y: 2 } })
    expect(base).toEqual({ nested: { x: 1 } })
  })
})

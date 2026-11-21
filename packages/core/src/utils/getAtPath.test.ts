import { describe, it, expect } from 'vitest'
import { getAtPath } from './getAtPath'

describe('getAtPath', () => {
  it('reads nested object and array paths', () => {
    const values = { a: { b: [{ c: 1 }, { c: 2 }] } }
    expect(getAtPath(values, 'a.b.1.c')).toBe(2)
    expect(getAtPath(values, 'a.b')).toEqual([{ c: 1 }, { c: 2 }])
  })
  it('returns undefined for missing paths or non-object steps', () => {
    expect(getAtPath({ a: 1 }, 'a.b')).toBeUndefined()
    expect(getAtPath(undefined, 'a')).toBeUndefined()
    expect(getAtPath({}, 'x.y')).toBeUndefined()
  })
})

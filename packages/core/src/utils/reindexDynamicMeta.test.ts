import { describe, it, expect } from 'vitest'
import { reindexDynamicMeta } from './reindexDynamicMeta'

describe('reindexDynamicMeta', () => {
  describe('remove mutation', () => {
    it('removes entries for the deleted row and decrements higher indices', () => {
      const meta = {
        'items.0.note': { hidden: true },
        'items.1.note': { disabled: true },
        'items.2.note': { placeholder: 'hello' },
        'other.field': { hidden: false },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'remove',
        index: 1,
      })

      expect(result).toEqual({
        'items.0.note': { hidden: true },
        'items.1.note': { placeholder: 'hello' },
        'other.field': { hidden: false },
      })
    })

    it('removes the first row and decrements all others', () => {
      const meta = {
        'items.0.type': { options: [{ label: 'A', value: 'a' }] },
        'items.1.type': { options: [{ label: 'B', value: 'b' }] },
        'items.2.type': { options: [{ label: 'C', value: 'c' }] },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'remove',
        index: 0,
      })

      expect(result).toEqual({
        'items.0.type': { options: [{ label: 'B', value: 'b' }] },
        'items.1.type': { options: [{ label: 'C', value: 'c' }] },
      })
    })

    it('removes the last row without affecting others', () => {
      const meta = {
        'items.0.note': { hidden: true },
        'items.1.note': { disabled: true },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'remove',
        index: 1,
      })

      expect(result).toEqual({
        'items.0.note': { hidden: true },
      })
    })
  })

  describe('move mutation', () => {
    it('moves a row down (from < to)', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row2' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'move',
        from: 0,
        to: 2,
      })

      expect(result).toEqual({
        'items.0.note': { label: 'row1' },
        'items.1.note': { label: 'row2' },
        'items.2.note': { label: 'row0' },
      })
    })

    it('moves a row up (from > to)', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row2' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'move',
        from: 2,
        to: 0,
      })

      expect(result).toEqual({
        'items.0.note': { label: 'row2' },
        'items.1.note': { label: 'row0' },
        'items.2.note': { label: 'row1' },
      })
    })

    it('no-op when from === to', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'move',
        from: 1,
        to: 1,
      })

      expect(result).toEqual(meta)
    })
  })

  describe('duplicate mutation', () => {
    it('copies source row entries to new index and increments higher indices', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row2' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'duplicate',
        index: 1,
      })

      expect(result).toEqual({
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row1' }, // duplicated from row 1
        'items.3.note': { label: 'row2' }, // shifted from row 2
      })
    })

    it('duplicates the first row', () => {
      const meta = {
        'items.0.type': { disabled: true },
        'items.1.type': { disabled: false },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'duplicate',
        index: 0,
      })

      expect(result).toEqual({
        'items.0.type': { disabled: true },
        'items.1.type': { disabled: true }, // duplicated
        'items.2.type': { disabled: false }, // shifted
      })
    })
  })

  describe('add mutation', () => {
    it('increments indices >= new index', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row2' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'add',
        index: 1,
      })

      expect(result).toEqual({
        'items.0.note': { label: 'row0' },
        'items.2.note': { label: 'row1' }, // shifted
        'items.3.note': { label: 'row2' }, // shifted
      })
    })

    it('adding at index 0 shifts all entries', () => {
      const meta = {
        'items.0.note': { hidden: true },
        'items.1.note': { hidden: false },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'add',
        index: 0,
      })

      expect(result).toEqual({
        'items.1.note': { hidden: true },
        'items.2.note': { hidden: false },
      })
    })

    it('adding at end does not shift existing entries', () => {
      const meta = {
        'items.0.note': { hidden: true },
        'items.1.note': { hidden: false },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'add',
        index: 2,
      })

      expect(result).toEqual({
        'items.0.note': { hidden: true },
        'items.1.note': { hidden: false },
      })
    })
  })

  describe('invalid mutations', () => {
    it('returns store unchanged for negative remove index', () => {
      const meta = { 'items.0.note': { hidden: true } }
      const result = reindexDynamicMeta(meta, 'items', {
        type: 'remove',
        index: -1,
      })
      expect(result).toBe(meta)
    })

    it('returns store unchanged for negative move from index', () => {
      const meta = { 'items.0.note': { hidden: true } }
      const result = reindexDynamicMeta(meta, 'items', {
        type: 'move',
        from: -1,
        to: 0,
      })
      expect(result).toBe(meta)
    })

    it('returns store unchanged for negative move to index', () => {
      const meta = { 'items.0.note': { hidden: true } }
      const result = reindexDynamicMeta(meta, 'items', {
        type: 'move',
        from: 0,
        to: -1,
      })
      expect(result).toBe(meta)
    })

    it('returns store unchanged for negative duplicate index', () => {
      const meta = { 'items.0.note': { hidden: true } }
      const result = reindexDynamicMeta(meta, 'items', {
        type: 'duplicate',
        index: -1,
      })
      expect(result).toBe(meta)
    })

    it('returns store unchanged for negative add index', () => {
      const meta = { 'items.0.note': { hidden: true } }
      const result = reindexDynamicMeta(meta, 'items', {
        type: 'add',
        index: -1,
      })
      expect(result).toBe(meta)
    })
  })

  describe('non-matching keys', () => {
    it('preserves keys that do not match the array pattern', () => {
      const meta = {
        'items.0.note': { hidden: true },
        globalField: { disabled: true },
        'other.0.field': { label: 'other' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'remove',
        index: 0,
      })

      expect(result).toEqual({
        globalField: { disabled: true },
        'other.0.field': { label: 'other' },
      })
    })

    it('handles multiple child fields per row', () => {
      const meta = {
        'items.0.note': { hidden: true },
        'items.0.type': { disabled: true },
        'items.1.note': { hidden: false },
        'items.1.type': { disabled: false },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'remove',
        index: 0,
      })

      expect(result).toEqual({
        'items.0.note': { hidden: false },
        'items.0.type': { disabled: false },
      })
    })
  })

  describe('insert mutation', () => {
    it('shifts rows at or after the index up by count', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row2' },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'insert',
        index: 1,
        count: 2,
      })

      expect(result).toEqual({
        'items.0.note': { label: 'row0' },
        'items.3.note': { label: 'row1' },
        'items.4.note': { label: 'row2' },
      })
    })
  })

  describe('swap mutation', () => {
    it('exchanges the overrides of two rows', () => {
      const meta = {
        'items.0.note': { label: 'row0' },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row2' },
        'items.2.type': { disabled: true },
      }

      const result = reindexDynamicMeta(meta, 'items', {
        type: 'swap',
        a: 0,
        b: 2,
      })

      expect(result).toEqual({
        'items.0.note': { label: 'row2' },
        'items.0.type': { disabled: true },
        'items.1.note': { label: 'row1' },
        'items.2.note': { label: 'row0' },
      })
    })
  })

  describe('clear mutation', () => {
    it('drops every row override of this array and keeps other keys', () => {
      const meta = {
        items: { label: 'Items' },
        'items.0.note': { label: 'row0' },
        'items.3.note': { label: 'row3' },
        'other.0.note': { label: 'other' },
      }

      const result = reindexDynamicMeta(meta, 'items', { type: 'clear' })

      expect(result).toEqual({
        items: { label: 'Items' },
        'other.0.note': { label: 'other' },
      })
    })
  })
})

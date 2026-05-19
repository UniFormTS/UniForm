// Feature: per-row-field-meta, Property 6: Re-indexing on row removal
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import { reindexDynamicMeta } from './reindexDynamicMeta'
import type { FieldDependencyResult } from '../types'

/**
 * Validates: Requirements 3.3
 *
 * Property 6: Re-indexing on row removal
 * For any dynamic meta store containing entries for an array with N rows,
 * when row R is removed, the resulting store shall contain no entries for row R,
 * and all entries for rows > R shall have their index decremented by 1.
 */

// --- Generators ---

/** Valid field name strings (alphabetic, no dots) */
const arbArrayName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,9}$/)

/** Non-negative integers (0–99) */
const arbRowIndex = fc.integer({ min: 0, max: 99 })

/** Valid child field name strings (alphabetic, no dots) */
const arbChildFieldName = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9]{0,9}$/)

/** Partial objects with random subsets of FieldDependencyResult properties */
const arbFieldDependencyResult: fc.Arbitrary<Partial<FieldDependencyResult>> =
  fc.record(
    {
      hidden: fc.boolean(),
      disabled: fc.boolean(),
      label: fc.string({ minLength: 1, maxLength: 20 }),
      placeholder: fc.string({ minLength: 1, maxLength: 20 }),
      description: fc.string({ minLength: 1, maxLength: 20 }),
      options: fc.array(
        fc.record({
          label: fc.string({ minLength: 1, maxLength: 10 }),
          value: fc.string({ minLength: 1, maxLength: 10 }),
        }),
        { minLength: 1, maxLength: 3 },
      ),
    },
    { requiredKeys: [] },
  )

describe('Property 6: Re-indexing on row removal', () => {
  it('removing row R deletes its entries and decrements indices > R', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        // Generate a set of row entries: array of (rowIndex, childFieldName, value)
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        // The row index to remove
        arbRowIndex,
        (arrayName, entries, removedRow) => {
          // Build the dynamic meta store from generated entries (last write wins for duplicate keys)
          const dynamicMeta: Record<string, Partial<FieldDependencyResult>> = {}
          for (const [rowIdx, childField, value] of entries) {
            const key = `${arrayName}.${rowIdx}.${childField}`
            dynamicMeta[key] = value
          }

          // Apply the remove mutation
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'remove',
            index: removedRow,
          })

          // Build a regex to parse keys for this array
          const keyPattern = new RegExp(
            `^${arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)\\.(.+)$`,
          )

          // Verify: entries originally at the removed row are gone
          for (const key of Object.keys(dynamicMeta)) {
            const match = keyPattern.exec(key)
            if (match && parseInt(match[1], 10) === removedRow) {
              // This key was for the removed row — it should not exist in result
              expect(result).not.toHaveProperty(key)
            }
          }

          // Verify: entries for rows > removedRow have been decremented by 1
          for (const key of Object.keys(dynamicMeta)) {
            const match = keyPattern.exec(key)
            if (!match) continue
            const originalIndex = parseInt(match[1], 10)
            const childField = match[2]

            if (originalIndex > removedRow) {
              const newKey = `${arrayName}.${originalIndex - 1}.${childField}`
              expect(result[newKey]).toEqual(dynamicMeta[key])
            } else if (originalIndex < removedRow) {
              // Entries below the removed row remain at the same index
              expect(result[key]).toEqual(dynamicMeta[key])
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('removed row entries are completely absent from the result', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, removedRow) => {
          // Build the dynamic meta store
          const dynamicMeta: Record<string, Partial<FieldDependencyResult>> = {}
          for (const [rowIdx, childField, value] of entries) {
            dynamicMeta[`${arrayName}.${rowIdx}.${childField}`] = value
          }

          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'remove',
            index: removedRow,
          })

          const keyPattern = new RegExp(
            `^${arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)\\.(.+)$`,
          )

          // For each child field that was in the removed row, verify the value
          // at that position in the result (if any) came from row removedRow+1
          const removedRowChildFields = new Set<string>()
          for (const key of Object.keys(dynamicMeta)) {
            const match = keyPattern.exec(key)
            if (match && parseInt(match[1], 10) === removedRow) {
              removedRowChildFields.add(match[2])
            }
          }

          for (const childField of removedRowChildFields) {
            const keyAtRemovedPosition = `${arrayName}.${removedRow}.${childField}`
            if (result[keyAtRemovedPosition] !== undefined) {
              // This value must have come from the row above (removedRow + 1), now decremented
              const originalKeyAbove = `${arrayName}.${removedRow + 1}.${childField}`
              expect(result[keyAtRemovedPosition]).toEqual(
                dynamicMeta[originalKeyAbove],
              )
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('non-matching keys are preserved unchanged after removal', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 10 },
        ),
        // Generate unique non-matching keys that cannot collide with array pattern
        fc.uniqueArray(
          fc.tuple(
            fc.stringMatching(/^_[a-zA-Z]{1,8}$/),
            arbFieldDependencyResult,
          ),
          { minLength: 1, maxLength: 5, selector: ([key]) => key },
        ),
        arbRowIndex,
        (arrayName, entries, globalEntries, removedRow) => {
          const dynamicMeta: Record<string, Partial<FieldDependencyResult>> = {}

          // Add array-scoped entries
          for (const [rowIdx, childField, value] of entries) {
            dynamicMeta[`${arrayName}.${rowIdx}.${childField}`] = value
          }

          // Add non-matching global entries (prefixed with _ to avoid matching array pattern)
          for (const [key, value] of globalEntries) {
            dynamicMeta[key] = value
          }

          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'remove',
            index: removedRow,
          })

          // All non-matching keys should be preserved unchanged
          for (const [key, value] of globalEntries) {
            expect(result[key]).toEqual(value)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('total entry count decreases by the number of entries at the removed row', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, removedRow) => {
          // Build the dynamic meta store (deduplicating by key - last write wins)
          const dynamicMeta: Record<string, Partial<FieldDependencyResult>> = {}
          for (const [rowIdx, childField, value] of entries) {
            dynamicMeta[`${arrayName}.${rowIdx}.${childField}`] = value
          }

          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'remove',
            index: removedRow,
          })

          // Count entries that were at the removed row in the deduplicated store
          const keyPattern = new RegExp(
            `^${arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)\\.(.+)$`,
          )
          let removedCount = 0
          for (const key of Object.keys(dynamicMeta)) {
            const match = keyPattern.exec(key)
            if (match && parseInt(match[1], 10) === removedRow) {
              removedCount++
            }
          }

          // Result should have exactly (original count - removed count) entries
          expect(Object.keys(result).length).toBe(
            Object.keys(dynamicMeta).length - removedCount,
          )
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: per-row-field-meta, Property 7: Re-indexing on row move
/**
 * Validates: Requirements 6.1
 *
 * Property 7: Re-indexing on row move
 * For any dynamic meta store containing entries for an array with N rows,
 * when row A is moved to position B, the resulting store shall have row A's
 * entries at index B, and all entries between A and B shall be shifted accordingly.
 */
describe('Property 7: Re-indexing on row move', () => {
  /** Helper to build a dynamic meta store from generated entries */
  function buildStore(
    arrayName: string,
    entries: Array<[number, string, Partial<FieldDependencyResult>]>,
  ): Record<string, Partial<FieldDependencyResult>> {
    const store: Record<string, Partial<FieldDependencyResult>> = {}
    for (const [rowIdx, childField, value] of entries) {
      store[`${arrayName}.${rowIdx}.${childField}`] = value
    }
    return store
  }

  /** Helper regex to parse row-indexed keys for a given array name */
  function buildKeyPattern(arrayName: string): RegExp {
    return new RegExp(
      `^${arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)\\.(.+)$`,
    )
  }

  it("row A's entries end up at index B after move", () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        arbRowIndex,
        (arrayName, entries, from, to) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'move',
            from,
            to,
          })

          const pattern = buildKeyPattern(arrayName)

          // Collect original entries at row `from`
          const entriesAtFrom: Array<{
            childField: string
            value: Partial<FieldDependencyResult>
          }> = []
          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (match && parseInt(match[1], 10) === from) {
              entriesAtFrom.push({ childField: match[2], value })
            }
          }

          // After move, those entries should be at index `to`
          for (const { childField, value } of entriesAtFrom) {
            const expectedKey = `${arrayName}.${to}.${childField}`
            expect(result[expectedKey]).toEqual(value)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rows between A and B are shifted by 1 in the appropriate direction', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        arbRowIndex,
        (arrayName, entries, from, to) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'move',
            from,
            to,
          })

          const pattern = buildKeyPattern(arrayName)

          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (!match) continue
            const originalIndex = parseInt(match[1], 10)
            const childField = match[2]

            if (originalIndex === from) continue // handled by other test

            let expectedIndex: number
            if (from < to) {
              // Moving down: rows in (from, to] shift up (decrement)
              if (originalIndex > from && originalIndex <= to) {
                expectedIndex = originalIndex - 1
              } else {
                expectedIndex = originalIndex
              }
            } else if (from > to) {
              // Moving up: rows in [to, from) shift down (increment)
              if (originalIndex >= to && originalIndex < from) {
                expectedIndex = originalIndex + 1
              } else {
                expectedIndex = originalIndex
              }
            } else {
              // from === to: no change
              expectedIndex = originalIndex
            }

            const expectedKey = `${arrayName}.${expectedIndex}.${childField}`
            expect(result[expectedKey]).toEqual(value)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('rows outside [min(A,B), max(A,B)] range are unchanged', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        arbRowIndex,
        (arrayName, entries, from, to) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'move',
            from,
            to,
          })

          const pattern = buildKeyPattern(arrayName)
          const minIdx = Math.min(from, to)
          const maxIdx = Math.max(from, to)

          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (!match) continue
            const originalIndex = parseInt(match[1], 10)

            // Rows strictly outside the affected range should be unchanged
            if (originalIndex < minIdx || originalIndex > maxIdx) {
              expect(result[key]).toEqual(value)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('total number of entries is preserved (move does not add or remove entries)', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        arbRowIndex,
        (arrayName, entries, from, to) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'move',
            from,
            to,
          })

          expect(Object.keys(result).length).toBe(
            Object.keys(dynamicMeta).length,
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  it('when from === to, the store is unchanged', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, index) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'move',
            from: index,
            to: index,
          })

          // Every key/value pair should be identical
          expect(result).toEqual(dynamicMeta)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: per-row-field-meta, Property 8: Duplication copies meta
/**
 * Validates: Requirements 6.2
 *
 * Property 8: Duplication copies meta
 * For any dynamic meta store containing entries for row R of an array,
 * when row R is duplicated (inserted at R+1), the new row at R+1 shall have
 * the same meta overrides as row R, and all entries for rows > R shall have
 * their index incremented by 1.
 */
describe('Property 8: Duplication copies meta', () => {
  /** Helper to build a dynamic meta store from generated entries */
  function buildStore(
    arrayName: string,
    entries: Array<[number, string, Partial<FieldDependencyResult>]>,
  ): Record<string, Partial<FieldDependencyResult>> {
    const store: Record<string, Partial<FieldDependencyResult>> = {}
    for (const [rowIdx, childField, value] of entries) {
      store[`${arrayName}.${rowIdx}.${childField}`] = value
    }
    return store
  }

  /** Helper regex to parse row-indexed keys for a given array name */
  function buildKeyPattern(arrayName: string): RegExp {
    return new RegExp(
      `^${arrayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\.(\\d+)\\.(.+)$`,
    )
  }

  it('source row R entries remain at index R after duplication', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, duplicatedRow) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'duplicate',
            index: duplicatedRow,
          })

          const pattern = buildKeyPattern(arrayName)

          // Collect original entries at the duplicated row
          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (match && parseInt(match[1], 10) === duplicatedRow) {
              // Original row R entries should still exist at index R
              expect(result[key]).toEqual(value)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('new row at R+1 has the same meta overrides as row R', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, duplicatedRow) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'duplicate',
            index: duplicatedRow,
          })

          const pattern = buildKeyPattern(arrayName)

          // For each entry at row R, there should be an identical entry at R+1
          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (match && parseInt(match[1], 10) === duplicatedRow) {
              const childField = match[2]
              const duplicateKey = `${arrayName}.${duplicatedRow + 1}.${childField}`
              expect(result[duplicateKey]).toEqual(value)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('all entries for rows > R have their index incremented by 1', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, duplicatedRow) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'duplicate',
            index: duplicatedRow,
          })

          const pattern = buildKeyPattern(arrayName)

          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (!match) continue
            const originalIndex = parseInt(match[1], 10)
            const childField = match[2]

            if (originalIndex > duplicatedRow) {
              // Entries above the duplicated row should be shifted up by 1
              const newKey = `${arrayName}.${originalIndex + 1}.${childField}`
              expect(result[newKey]).toEqual(value)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('total entry count increases by the number of entries at row R', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, duplicatedRow) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'duplicate',
            index: duplicatedRow,
          })

          const pattern = buildKeyPattern(arrayName)

          // Count entries at the duplicated row in the original store
          let duplicatedCount = 0
          for (const key of Object.keys(dynamicMeta)) {
            const match = pattern.exec(key)
            if (match && parseInt(match[1], 10) === duplicatedRow) {
              duplicatedCount++
            }
          }

          // Result should have original count + duplicated count entries
          expect(Object.keys(result).length).toBe(
            Object.keys(dynamicMeta).length + duplicatedCount,
          )
        },
      ),
      { numRuns: 100 },
    )
  })

  it('entries for rows < R are unchanged', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        arbRowIndex,
        (arrayName, entries, duplicatedRow) => {
          const dynamicMeta = buildStore(arrayName, entries)
          const result = reindexDynamicMeta(dynamicMeta, arrayName, {
            type: 'duplicate',
            index: duplicatedRow,
          })

          const pattern = buildKeyPattern(arrayName)

          for (const [key, value] of Object.entries(dynamicMeta)) {
            const match = pattern.exec(key)
            if (!match) continue
            const originalIndex = parseInt(match[1], 10)

            if (originalIndex < duplicatedRow) {
              // Entries below the duplicated row should remain unchanged
              expect(result[key]).toEqual(value)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })
})

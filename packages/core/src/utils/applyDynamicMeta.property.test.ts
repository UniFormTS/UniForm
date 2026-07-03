// Feature: per-row-field-meta, Property 2: applyDynamicMeta row isolation
import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type * as z from 'zod/v4/core'
import { applyDynamicMeta } from './fieldPipeline'
import type { ArrayFieldConfigWithRowMeta } from './fieldPipeline'
import type { FieldConfig, FieldDependencyResult } from '../types'

/**
 * Validates: Requirements 1.4, 1.5, 3.1, 3.2
 *
 * Property 2: applyDynamicMeta row isolation
 * For any set of row-indexed dynamic meta overrides and any array field with M rows,
 * applying the overrides shall result in each row N receiving only the overrides
 * whose key contains index N, and no overrides from other rows.
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

/** Creates a minimal array FieldConfig for testing */
function createArrayFieldConfig(arrayName: string): FieldConfig {
  const itemConfig: FieldConfig = {
    name: 'item',
    label: 'Item',
    required: false,
    meta: {},
    type: 'object',
    children: [],
    schema: {} as unknown as z.$ZodType,
  }

  return {
    name: arrayName,
    label: arrayName,
    required: false,
    meta: {},
    type: 'array',
    itemConfig,
    schema: {} as unknown as z.$ZodType,
  }
}

describe('Property 2: applyDynamicMeta row isolation', () => {
  it('row-indexed overrides are grouped by row index into _rowDynamicMeta', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        // Generate a set of row-indexed overrides: array of (rowIndex, childFieldName, value)
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 20 },
        ),
        (arrayName, entries) => {
          // Build the overrides record with row-indexed keys
          const overrides: Record<string, Partial<FieldDependencyResult>> = {}
          for (const [rowIdx, childField, value] of entries) {
            const key = `${arrayName}.${rowIdx}.${childField}`
            overrides[key] = value
          }

          // Create an array field config
          const fields: FieldConfig[] = [createArrayFieldConfig(arrayName)]

          // Apply dynamic meta
          const result = applyDynamicMeta(fields, overrides)
          const arrayField = result[0] as ArrayFieldConfigWithRowMeta

          // Verify _rowDynamicMeta exists
          expect(arrayField._rowDynamicMeta).toBeDefined()

          // Verify each row N only contains overrides whose key had index N
          for (const [rowIdx, childField] of entries) {
            const key = `${arrayName}.${rowIdx}.${childField}`
            // The last-write-wins value for this key
            const expectedValue = overrides[key]
            expect(arrayField._rowDynamicMeta![rowIdx]).toBeDefined()
            expect(arrayField._rowDynamicMeta![rowIdx][childField]).toEqual(
              expectedValue,
            )
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('each row N receives only overrides whose key contains index N (no cross-row leakage)', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        // Generate overrides for at least 2 distinct rows
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 2, maxLength: 20 },
        ),
        (arrayName, entries) => {
          // Build the overrides record
          const overrides: Record<string, Partial<FieldDependencyResult>> = {}
          for (const [rowIdx, childField, value] of entries) {
            overrides[`${arrayName}.${rowIdx}.${childField}`] = value
          }

          // Create an array field config
          const fields: FieldConfig[] = [createArrayFieldConfig(arrayName)]

          // Apply dynamic meta
          const result = applyDynamicMeta(fields, overrides)
          const arrayField = result[0] as ArrayFieldConfigWithRowMeta

          if (!arrayField._rowDynamicMeta) return // no row-indexed overrides matched

          // For each row in _rowDynamicMeta, verify all entries belong to that row
          for (const [rowIndexStr, rowOverrides] of Object.entries(
            arrayField._rowDynamicMeta,
          )) {
            const rowIndex = Number(rowIndexStr)

            // Collect expected child fields for this row from the original overrides
            const expectedChildFields = new Set<string>()
            for (const [key] of Object.entries(overrides)) {
              const match = /^(.+?)\.(\d+)\.(.+)$/.exec(key)
              if (
                match &&
                match[1] === arrayName &&
                parseInt(match[2], 10) === rowIndex
              ) {
                expectedChildFields.add(match[3])
              }
            }

            // Every child field in this row's overrides must be in the expected set
            for (const childField of Object.keys(rowOverrides)) {
              expect(expectedChildFields.has(childField)).toBe(true)
            }
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('non-row-indexed overrides still apply to the field directly (backward compat)', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbFieldDependencyResult,
        // Also generate some row-indexed overrides
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 0, maxLength: 10 },
        ),
        (arrayName, topLevelOverride, rowEntries) => {
          // Ensure the top-level override has at least one property set
          fc.pre(Object.keys(topLevelOverride).length > 0)

          // Build overrides with both top-level and row-indexed keys
          const overrides: Record<string, Partial<FieldDependencyResult>> = {}
          overrides[arrayName] = topLevelOverride
          for (const [rowIdx, childField, value] of rowEntries) {
            overrides[`${arrayName}.${rowIdx}.${childField}`] = value
          }

          // Create an array field config
          const fields: FieldConfig[] = [createArrayFieldConfig(arrayName)]

          // Apply dynamic meta
          const result = applyDynamicMeta(fields, overrides)
          const arrayField = result[0] as ArrayFieldConfigWithRowMeta

          // Verify top-level override was applied to the field's meta/label/options
          const { options, label, ...metaOverrides } = topLevelOverride
          if (label !== undefined) {
            expect(arrayField.label).toBe(label)
          }
          if (options !== undefined) {
            expect(
              (arrayField as unknown as Record<string, unknown>).options,
            ).toEqual(options)
          }
          for (const [key, value] of Object.entries(metaOverrides)) {
            expect(arrayField.meta[key]).toEqual(value)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('overrides for other array fields do not leak into this array field', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        // Generate a different array name that is distinct
        arbArrayName,
        fc.array(
          fc.tuple(arbRowIndex, arbChildFieldName, arbFieldDependencyResult),
          { minLength: 1, maxLength: 10 },
        ),
        (arrayName, otherArrayName, entries) => {
          // Ensure the two array names are different
          fc.pre(arrayName !== otherArrayName)

          // Build overrides only for the OTHER array
          const overrides: Record<string, Partial<FieldDependencyResult>> = {}
          for (const [rowIdx, childField, value] of entries) {
            overrides[`${otherArrayName}.${rowIdx}.${childField}`] = value
          }

          // Create a field config for our target array
          const fields: FieldConfig[] = [createArrayFieldConfig(arrayName)]

          // Apply dynamic meta
          const result = applyDynamicMeta(fields, overrides)
          const arrayField = result[0] as ArrayFieldConfigWithRowMeta

          // The target array should NOT have any _rowDynamicMeta
          expect(arrayField._rowDynamicMeta).toBeUndefined()
        },
      ),
      { numRuns: 100 },
    )
  })

  it('multiple rows maintain independent override entries without conflict', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        // Generate entries for exactly 2 distinct row indices with the same child field
        arbRowIndex,
        arbRowIndex,
        arbChildFieldName,
        arbFieldDependencyResult,
        arbFieldDependencyResult,
        (arrayName, rowA, rowB, childField, valueA, valueB) => {
          // Ensure distinct rows
          fc.pre(rowA !== rowB)

          // Build overrides with same child field name but different rows
          const overrides: Record<string, Partial<FieldDependencyResult>> = {}
          overrides[`${arrayName}.${rowA}.${childField}`] = valueA
          overrides[`${arrayName}.${rowB}.${childField}`] = valueB

          // Create an array field config
          const fields: FieldConfig[] = [createArrayFieldConfig(arrayName)]

          // Apply dynamic meta
          const result = applyDynamicMeta(fields, overrides)
          const arrayField = result[0] as ArrayFieldConfigWithRowMeta

          // Verify both rows have their own independent entries
          expect(arrayField._rowDynamicMeta).toBeDefined()
          expect(arrayField._rowDynamicMeta![rowA][childField]).toEqual(valueA)
          expect(arrayField._rowDynamicMeta![rowB][childField]).toEqual(valueB)
        },
      ),
      { numRuns: 100 },
    )
  })
})

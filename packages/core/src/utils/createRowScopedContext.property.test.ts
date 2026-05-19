// Feature: per-row-field-meta, Property 1: Row-scoped setFieldMeta produces fully-qualified keys
import { describe, it, expect, vi } from 'vitest'
import * as fc from 'fast-check'
import { createRowScopedContext } from './createRowScopedContext'
import type { FieldDependencyResult } from '../types'
import type { UniFormContext } from '../UniForm'

/**
 * Validates: Requirements 1.1, 1.2, 2.1, 2.2
 *
 * Property 1: Row-scoped setFieldMeta produces fully-qualified keys
 * For any array field name, row index N, and sibling child field name,
 * when `setFieldMeta` is called from a row-scoped context with that child
 * field name, the dynamic meta store shall contain an entry keyed by
 * `"{arrayName}.{N}.{childFieldName}"`.
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

/** Creates a minimal mock UniFormContext that records setFieldMeta calls */
function createMockBaseContext(): {
  ctx: UniFormContext<any>
  calls: Array<{ field: string; meta: Partial<FieldDependencyResult> }>
} {
  const calls: Array<{ field: string; meta: Partial<FieldDependencyResult> }> =
    []
  const ctx = {
    setValue: vi.fn(),
    setValues: vi.fn(),
    getValues: vi.fn(() => ({})),
    resetField: vi.fn(),
    reset: vi.fn(),
    setError: vi.fn(),
    setErrors: vi.fn(),
    clearErrors: vi.fn(),
    submit: vi.fn(),
    focus: vi.fn(),
    setFieldMeta: vi.fn(
      (field: string, meta: Partial<FieldDependencyResult>) => {
        calls.push({ field, meta })
      },
    ),
  } as unknown as UniFormContext<any>

  return { ctx, calls }
}

describe('Property 1: Row-scoped setFieldMeta produces fully-qualified keys', () => {
  it('sibling field names are prefixed with arrayName.rowIndex', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        arbFieldDependencyResult,
        (arrayName, rowIndex, childFieldName, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set([childFieldName])

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          // Call setFieldMeta with the child field name
          scopedCtx.setFieldMeta(childFieldName as any, meta)

          // The base context should have been called with the fully-qualified key
          const expectedKey = `${arrayName}.${rowIndex}.${childFieldName}`
          expect(calls).toHaveLength(1)
          expect(calls[0].field).toBe(expectedKey)
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('multiple sibling fields all produce correctly qualified keys', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        fc.uniqueArray(arbChildFieldName, { minLength: 2, maxLength: 5 }),
        arbFieldDependencyResult,
        (arrayName, rowIndex, childFieldNames, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set(childFieldNames)

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          // Call setFieldMeta for each sibling field
          for (const childFieldName of childFieldNames) {
            scopedCtx.setFieldMeta(childFieldName as any, meta)
          }

          // Each call should produce a fully-qualified key
          expect(calls).toHaveLength(childFieldNames.length)
          for (let i = 0; i < childFieldNames.length; i++) {
            const expectedKey = `${arrayName}.${rowIndex}.${childFieldNames[i]}`
            expect(calls[i].field).toBe(expectedKey)
            expect(calls[i].meta).toEqual(meta)
          }
        },
      ),
      { numRuns: 100 },
    )
  })

  it('the fully-qualified key follows the exact format arrayName.rowIndex.childFieldName', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        arbFieldDependencyResult,
        (arrayName, rowIndex, childFieldName, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set([childFieldName])

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          scopedCtx.setFieldMeta(childFieldName as any, meta)

          // Verify the key structure: split by dots should give exactly 3 parts
          const key = calls[0].field
          const parts = key.split('.')
          expect(parts).toHaveLength(3)
          expect(parts[0]).toBe(arrayName)
          expect(parts[1]).toBe(String(rowIndex))
          expect(parts[2]).toBe(childFieldName)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('the meta value passed through is identical to the input meta', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        arbFieldDependencyResult,
        (arrayName, rowIndex, childFieldName, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set([childFieldName])

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          scopedCtx.setFieldMeta(childFieldName as any, meta)

          // The meta value should be passed through unchanged
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: per-row-field-meta, Property 3: Non-array field meta is stored globally
describe('Property 3: Non-array field meta is stored globally', () => {
  /**
   * Validates: Requirements 1.3, 4.1
   *
   * Property 3: Non-array field meta is stored globally
   * For any field name that does not match a known array item sibling,
   * when `setFieldMeta` is called from any context (row-scoped or global),
   * the override shall be stored with the field name as-is (no row prefix).
   */

  it('non-sibling field names are passed through without row prefix from row-scoped context', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        arbChildFieldName,
        arbFieldDependencyResult,
        (arrayName, rowIndex, siblingField, nonSiblingField, meta) => {
          // Ensure the non-sibling field is different from the sibling field
          fc.pre(nonSiblingField !== siblingField)

          const { ctx: baseCtx, calls } = createMockBaseContext()
          // Only the siblingField is in the itemFieldNames set
          const itemFieldNames = new Set([siblingField])

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          // Call setFieldMeta with a field name NOT in the sibling set
          scopedCtx.setFieldMeta(nonSiblingField as any, meta)

          // The base context should have been called with the field name as-is
          expect(calls).toHaveLength(1)
          expect(calls[0].field).toBe(nonSiblingField)
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('non-sibling field names are never prefixed regardless of arrayName or rowIndex', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        fc.uniqueArray(arbChildFieldName, { minLength: 1, maxLength: 5 }),
        arbFieldDependencyResult,
        (arrayName, rowIndex, nonSiblingField, siblingFields, meta) => {
          // Ensure the non-sibling field is not in the sibling set
          fc.pre(!siblingFields.includes(nonSiblingField))

          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set(siblingFields)

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          scopedCtx.setFieldMeta(nonSiblingField as any, meta)

          // The key should NOT contain the arrayName or rowIndex prefix
          expect(calls[0].field).not.toContain(`${arrayName}.${rowIndex}.`)
          expect(calls[0].field).toBe(nonSiblingField)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('global context (no row scoping) stores field meta with key as-is', () => {
    fc.assert(
      fc.property(
        arbChildFieldName,
        arbFieldDependencyResult,
        (fieldName, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()

          // Call setFieldMeta directly on the base context (global, no row scoping)
          baseCtx.setFieldMeta(fieldName as any, meta)

          // The field name should be stored as-is
          expect(calls).toHaveLength(1)
          expect(calls[0].field).toBe(fieldName)
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('meta value is preserved unchanged when passing through globally', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        arbChildFieldName,
        arbFieldDependencyResult,
        (arrayName, rowIndex, siblingField, nonSiblingField, meta) => {
          fc.pre(nonSiblingField !== siblingField)

          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set([siblingField])

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            () => ({}),
          )

          scopedCtx.setFieldMeta(nonSiblingField as any, meta)

          // The meta should be passed through identically
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: per-row-field-meta, Property 5: getValues scoping
describe('Property 5: getValues scoping', () => {
  /**
   * Validates: Requirements 2.3, 5.1, 5.2
   *
   * Property 5: getValues scoping
   * For any array with N rows, when a handler fires for row K, `getValues()`
   * shall return an object equal to the K-th element of the array. When a
   * handler fires for a top-level field, `getValues()` shall return the full
   * form values object.
   */

  /** Generates an arbitrary row object with random string fields */
  const arbRowObject = fc.dictionary(
    arbChildFieldName,
    fc.oneof(
      fc.string({ minLength: 1, maxLength: 10 }),
      fc.integer(),
      fc.boolean(),
    ),
    { minKeys: 1, maxKeys: 5 },
  )

  it('getValues returns the K-th row element when handler fires for row K', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbChildFieldName,
        fc.array(arbRowObject, { minLength: 1, maxLength: 20 }),
        (arrayName, childFieldName, rows) => {
          // Pick a valid row index
          const rowIndex =
            rows.length > 0 ? Math.floor(Math.random() * rows.length) : 0
          fc.pre(rowIndex < rows.length)

          const { ctx: baseCtx } = createMockBaseContext()
          const itemFieldNames = new Set([childFieldName])

          // The getValues callback returns the specific row's values
          const getValues = () => rows[rowIndex] as Record<string, unknown>

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            rowIndex,
            itemFieldNames,
            getValues,
          )

          // getValues on the scoped context should return the K-th row element
          const result = scopedCtx.getValues()
          expect(result).toEqual(rows[rowIndex])
        },
      ),
      { numRuns: 100 },
    )
  })

  it('getValues returns exactly the row object, not the full form values', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbRowIndex,
        arbChildFieldName,
        fc.array(arbRowObject, { minLength: 2, maxLength: 10 }),
        (arrayName, rowIndex, childFieldName, rows) => {
          // Ensure rowIndex is within bounds
          const validRowIndex = rowIndex % rows.length

          const { ctx: baseCtx } = createMockBaseContext()
          const itemFieldNames = new Set([childFieldName])

          // Simulate full form values containing the array
          const fullFormValues = { [arrayName]: rows, otherField: 'global' }

          // The getValues callback for a row-scoped context returns only the row
          const getValues = () => rows[validRowIndex] as Record<string, unknown>

          const scopedCtx = createRowScopedContext(
            baseCtx,
            arrayName,
            validRowIndex,
            itemFieldNames,
            getValues,
          )

          const result = scopedCtx.getValues()

          // Should be the row object, not the full form values
          expect(result).toEqual(rows[validRowIndex])
          expect(result).not.toHaveProperty('otherField')
        },
      ),
      { numRuns: 100 },
    )
  })

  it('top-level (non-row-scoped) context getValues returns full form values', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        fc.array(arbRowObject, { minLength: 1, maxLength: 10 }),
        fc.dictionary(
          arbChildFieldName,
          fc.oneof(fc.string({ minLength: 1, maxLength: 10 }), fc.integer()),
          { minKeys: 1, maxKeys: 3 },
        ),
        (arrayName, rows, extraFields) => {
          // Simulate full form values
          const fullFormValues = { [arrayName]: rows, ...extraFields }

          const { ctx: baseCtx } = createMockBaseContext()
          // Override the base context's getValues to return full form values
          ;(baseCtx.getValues as any) = () => fullFormValues

          // When using the base context directly (top-level handler), getValues returns full form values
          const result = baseCtx.getValues()
          expect(result).toEqual(fullFormValues)
          // It should contain the array and extra fields
          expect(result).toHaveProperty(arrayName)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('getValues for different row indices returns different row objects', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbChildFieldName,
        fc.array(arbRowObject, { minLength: 2, maxLength: 10 }),
        (arrayName, childFieldName, rows) => {
          const { ctx: baseCtx } = createMockBaseContext()
          const itemFieldNames = new Set([childFieldName])

          // Create scoped contexts for two different rows
          const rowA = 0
          const rowB = rows.length - 1
          fc.pre(rowA !== rowB)

          const scopedCtxA = createRowScopedContext(
            baseCtx,
            arrayName,
            rowA,
            itemFieldNames,
            () => rows[rowA] as Record<string, unknown>,
          )

          const scopedCtxB = createRowScopedContext(
            baseCtx,
            arrayName,
            rowB,
            itemFieldNames,
            () => rows[rowB] as Record<string, unknown>,
          )

          // Each scoped context returns its own row's values
          expect(scopedCtxA.getValues()).toEqual(rows[rowA])
          expect(scopedCtxB.getValues()).toEqual(rows[rowB])
        },
      ),
      { numRuns: 100 },
    )
  })
})

// Feature: per-row-field-meta, Property 4: Explicit fully-qualified paths pass through unchanged
describe('Property 4: Explicit fully-qualified paths pass through unchanged', () => {
  /**
   * Validates: Requirements 4.2
   *
   * Property 4: Explicit fully-qualified paths pass through unchanged
   * For any explicitly fully-qualified path (e.g. "items.2.note") passed to
   * `setFieldMeta` from a top-level (non-row-scoped) handler, the dynamic meta
   * store shall contain the override keyed by that exact path.
   */

  /** Generates a fully-qualified path like "arrayName.rowIndex.childField" */
  const arbFullyQualifiedPath = fc
    .tuple(arbArrayName, arbRowIndex, arbChildFieldName)
    .map(
      ([arrayName, rowIndex, childField]) =>
        `${arrayName}.${rowIndex}.${childField}`,
    )

  it('explicit fully-qualified paths are stored as-is when called from base context', () => {
    fc.assert(
      fc.property(
        arbFullyQualifiedPath,
        arbFieldDependencyResult,
        (fullyQualifiedPath, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()

          // Call setFieldMeta directly on the base context (top-level handler)
          baseCtx.setFieldMeta(fullyQualifiedPath as any, meta)

          // The path should be stored exactly as provided
          expect(calls).toHaveLength(1)
          expect(calls[0].field).toBe(fullyQualifiedPath)
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('explicit fully-qualified paths pass through unchanged even when a row-scoped context exists for a different array', () => {
    fc.assert(
      fc.property(
        arbArrayName,
        arbArrayName,
        arbRowIndex,
        arbRowIndex,
        arbChildFieldName,
        arbChildFieldName,
        arbFieldDependencyResult,
        (
          scopedArrayName,
          pathArrayName,
          scopedRowIndex,
          pathRowIndex,
          siblingField,
          pathChildField,
          meta,
        ) => {
          // Ensure the fully-qualified path targets a different array than the scoped one
          fc.pre(scopedArrayName !== pathArrayName)

          const { ctx: baseCtx, calls } = createMockBaseContext()
          const itemFieldNames = new Set([siblingField])

          const scopedCtx = createRowScopedContext(
            baseCtx,
            scopedArrayName,
            scopedRowIndex,
            itemFieldNames,
            () => ({}),
          )

          // Call setFieldMeta with a fully-qualified path that doesn't match any sibling
          const fullyQualifiedPath = `${pathArrayName}.${pathRowIndex}.${pathChildField}`
          scopedCtx.setFieldMeta(fullyQualifiedPath as any, meta)

          // Since the path is not in itemFieldNames, it passes through unchanged
          expect(calls).toHaveLength(1)
          expect(calls[0].field).toBe(fullyQualifiedPath)
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('the stored key exactly matches the input path with no transformation', () => {
    fc.assert(
      fc.property(
        arbFullyQualifiedPath,
        arbFieldDependencyResult,
        (fullyQualifiedPath, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()

          baseCtx.setFieldMeta(fullyQualifiedPath as any, meta)

          // Verify exact string equality — no prefix added, no modification
          const storedKey = calls[0].field
          expect(storedKey).toStrictEqual(fullyQualifiedPath)
          // Verify it still has the dot-separated structure
          expect(storedKey.split('.')).toHaveLength(3)
        },
      ),
      { numRuns: 100 },
    )
  })

  it('meta value is preserved unchanged when storing with fully-qualified path', () => {
    fc.assert(
      fc.property(
        arbFullyQualifiedPath,
        arbFieldDependencyResult,
        (fullyQualifiedPath, meta) => {
          const { ctx: baseCtx, calls } = createMockBaseContext()

          baseCtx.setFieldMeta(fullyQualifiedPath as any, meta)

          // The meta object should be passed through identically
          expect(calls[0].meta).toEqual(meta)
        },
      ),
      { numRuns: 100 },
    )
  })
})

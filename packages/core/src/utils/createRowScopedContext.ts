import type * as z from 'zod/v4/core'
import type { FormMethods, FieldDependencyResult } from '../types'
import type { UniFormContext } from '../UniForm'

/**
 * Signature for onChange handlers on array item fields.
 * The third parameter is the row index where the change originated.
 */
export type RowAwareOnChange = (
  value: unknown,
  formMethods: FormMethods,
  rowIndex: number,
) => void

/**
 * Creates a UniFormContext where `setFieldMeta` and `getValues` are scoped
 * to a specific array row.
 *
 * - If the field key matches a known sibling item field name → prefix with
 *   `"arrayName.rowIndex."` before delegating to the base context.
 * - Otherwise → pass through to the base `setFieldMeta` unchanged (global override).
 * - `getValues` returns the values object for the specific row.
 */
export function createRowScopedContext<TSchema extends z.$ZodObject>(
  baseCtx: UniFormContext<TSchema>,
  arrayName: string,
  rowIndex: number,
  itemFieldNames: Set<string>,
  getValues: () => Record<string, unknown>,
): UniFormContext<TSchema> {
  return {
    ...baseCtx,
    getValues: getValues as UniFormContext<TSchema>['getValues'],
    setFieldMeta: (field, meta) => {
      const fieldStr = field as string
      // Check bare child name (e.g. "notes") or array-prefixed child name (e.g. "tasks.notes")
      const prefix = arrayName + '.'
      const childName = fieldStr.startsWith(prefix)
        ? fieldStr.slice(prefix.length)
        : fieldStr

      if (itemFieldNames.has(childName)) {
        // Scope to the specific row
        const qualifiedKey = `${arrayName}.${rowIndex}.${childName}`
        baseCtx.setFieldMeta(
          qualifiedKey as Parameters<typeof baseCtx.setFieldMeta>[0],
          meta as Partial<FieldDependencyResult>,
        )
      } else {
        // Pass through unchanged for non-sibling field names
        baseCtx.setFieldMeta(field, meta)
      }
    },
  }
}

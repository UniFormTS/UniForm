import { useMemo } from 'react'
import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../types'

/**
 * Filters and sorts a list of field configs based on the current form values.
 *
 * - Fields with `meta.hidden === true` are always excluded.
 * - Fields with a `meta.condition` function are included only when the
 *   function returns `true` for the current values.
 * - Remaining fields are sorted ascending by `meta.order` (fields without an
 *   order appear last).
 *
 * Re-evaluates reactively whenever the watched form values change.
 *
 * @param fields - The full list of field configs to filter and sort.
 * @param control - The RHF `control` object from the parent form.
 * @param scopeName - When provided, conditions receive only the values at this
 *   path (e.g. `"tasks.0"` for an array row) rather than the full form values.
 *   This enables row-local sibling conditions inside arrays.
 * @returns The filtered and ordered subset of `fields`.
 */
export function useConditionalFields(
  fields: FieldConfig[],
  control: Control,
  scopeName?: string,
): FieldConfig[] {
  const allValues = useWatch({ control })
  const scopedValues = useWatch({ control, name: scopeName as string })
  const values = scopeName ? scopedValues : allValues

  return useMemo(() => {
    return fields
      .filter((field) => {
        if (field.meta.hidden) return false
        if (typeof field.meta.condition === 'function') {
          return field.meta.condition(values)
        }
        return true
      })
      .sort((a, b) => {
        const orderA =
          typeof a.meta.order === 'number' ? a.meta.order : Infinity
        const orderB =
          typeof b.meta.order === 'number' ? b.meta.order : Infinity
        return orderA - orderB
      })
  }, [fields, values])
}

import { useMemo, useRef } from 'react'
import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../types'
import { isFieldHidden } from '../utils/hiddenFields'

// `useWatch` with `compute`, over all values or those at `name`
const watchComputed = useWatch as unknown as (props: {
  control: Control
  name?: string
  compute: (values: unknown) => string
}) => unknown

/** Which of `fields` are shown, as a string (`'1'` shown, `'0'` hidden). */
function visibilityKey(fields: FieldConfig[], values: unknown): string {
  let key = ''
  for (const field of fields) {
    key +=
      field.meta.render === false || isFieldHidden(field, values) ? '0' : '1'
  }
  return key
}

/**
 * Filters and sorts a list of field configs based on the current form values.
 *
 * - Fields with `meta.hidden === true` or `meta.render === false` are always
 *   excluded (a `render: false` field is still validated and submitted).
 * - Fields with a `meta.condition` function are included only when the
 *   function returns `true` for the current values.
 * - Remaining fields are sorted ascending by `meta.order` (fields without an
 *   order appear last).
 *
 * Conditions re-evaluate on every value change, but the calling component
 * re-renders only when the set of visible fields changes.
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
  // `compute` runs on every value change; RHF re-renders only when its result
  // (which fields are visible) changes. It records the values, so rendering
  // evaluates against the latest values and the current `fields`.
  const latest = useRef<unknown>(undefined)
  const failures = useRef(0)
  const compute = (values: unknown): string => {
    latest.current = values
    try {
      return visibilityKey(fields, values)
    } catch {
      // Re-render, so the condition's error is thrown while rendering
      return `error:${++failures.current}`
    }
  }
  const watched = watchComputed({ control, name: scopeName, compute })
  // RHF versions without `compute` return the watched values instead
  if (typeof watched !== 'string') latest.current = watched

  const key = visibilityKey(fields, latest.current)

  return useMemo(
    () =>
      fields
        .filter((_, i) => key[i] === '1')
        .sort((a, b) => {
          const orderA =
            typeof a.meta.order === 'number' ? a.meta.order : Infinity
          const orderB =
            typeof b.meta.order === 'number' ? b.meta.order : Infinity
          return orderA - orderB
        }),
    [fields, key],
  )
}

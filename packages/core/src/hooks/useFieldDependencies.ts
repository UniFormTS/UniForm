import { useMemo, useEffect, useRef } from 'react'
import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig, FieldDependencyResult } from '../types'

type SetValue = (
  name: string,
  value: unknown,
  options?: { shouldValidate?: boolean; shouldDirty?: boolean },
) => void

/**
 * Reactively computes per-field overrides produced by each field's `depend`
 * function and merges them into the returned field configs.
 *
 * Covered overrides: `options`, `hidden`, `disabled`, `label`, `placeholder`,
 * `description`, `value`.
 *
 * When `value` is returned from `depend`, the field's form value is updated
 * imperatively via `setValue`. Omit `value` (or return `undefined`) to leave
 * the current value untouched.
 */
export function useFieldDependencies(
  fields: FieldConfig[],
  control: Control,
  setValue: SetValue,
): FieldConfig[] {
  const values = useWatch({ control })

  // Keep a ref so the effect can read the latest values without being in deps
  const valuesRef = useRef<Record<string, unknown>>(values)
  valuesRef.current = values

  const [updatedFields, valueOverrides] = useMemo(() => {
    const overrides: Array<{ name: string; value: unknown }> = []

    const result = fields.map((field) => {
      const depend = field.meta.depend
      if (depend == null) return field

      const override: FieldDependencyResult = depend(values)
      const { options, label, value, ...metaOverrides } = override

      if (value !== undefined) {
        overrides.push({ name: field.name, value })
      }

      const hasMetaChanges = Object.keys(metaOverrides).length > 0
      const hasOptionChanges = options !== undefined
      const hasLabelChange = label !== undefined

      if (!hasMetaChanges && !hasOptionChanges && !hasLabelChange) return field

      return {
        ...field,
        ...(hasOptionChanges ? { options } : {}),
        // label lives at the top-level field.label (used by DefaultFieldWrapper)
        ...(hasLabelChange ? { label } : {}),
        ...(hasMetaChanges || hasLabelChange
          ? {
              meta: {
                ...field.meta,
                ...metaOverrides,
                ...(hasLabelChange ? { label } : {}),
              },
            }
          : {}),
      }
    })

    return [result, overrides] as const
  }, [fields, values])

  useEffect(() => {
    for (const { name, value } of valueOverrides) {
      // Skip if the form already holds the target value (prevents infinite loop)
      if (valuesRef.current[name] === value) continue
      setValue(name, value, { shouldValidate: true, shouldDirty: true })
    }
  }, [valueOverrides, setValue])

  return updatedFields
}

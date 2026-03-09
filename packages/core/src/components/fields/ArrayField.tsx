import { useFieldArray } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { FieldRenderer } from '../FieldRenderer'
import { getDefaultValue } from './getDefaultValue'

type ArrayFieldProps = {
  field: FieldConfig
  control: Control
  effectiveName: string
}

export function ArrayField({ field, control, effectiveName }: ArrayFieldProps) {
  const {
    fields: rows,
    append,
    remove,
  } = useFieldArray({
    control,
    name: effectiveName,
  })

  const itemConfig = field.itemConfig

  if (!itemConfig) return null

  // When the array belongs to a section, propagate section to the item config
  // so nested ObjectField also skips its own <fieldset>.
  const effectiveItemConfig =
    field.meta.section && !itemConfig.meta.section
      ? {
          ...itemConfig,
          meta: { ...itemConfig.meta, section: field.meta.section },
        }
      : itemConfig

  const content = (
    <>
      {rows.map((row, index) => (
        <div key={row.id}>
          <FieldRenderer
            field={effectiveItemConfig}
            control={control}
            namePrefix={`${effectiveName}.${index}`}
          />
          <button type='button' onClick={() => remove(index)}>
            Remove
          </button>
        </div>
      ))}
      <button
        type='button'
        onClick={() =>
          append(getDefaultValue(itemConfig) as Record<string, unknown>)
        }
      >
        Add
      </button>
    </>
  )

  if (field.meta.section) {
    return content
  }

  return (
    <fieldset>
      {field.label && <legend>{field.label}</legend>}
      {content}
    </fieldset>
  )
}

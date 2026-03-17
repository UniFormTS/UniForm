import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { FieldRenderer } from '../FieldRenderer'

type ObjectFieldProps = {
  field: Extract<FieldConfig, { type: 'object' }>
  control: Control
  namePrefix?: string
  depth?: number
  shouldUnregister?: boolean
}

export function ObjectField({
  field,
  control,
  namePrefix,
  depth = 0,
  shouldUnregister,
}: ObjectFieldProps) {
  const children = field.children

  const content = children.map((child, idx) => (
    <FieldRenderer
      key={child.name}
      field={child}
      control={control}
      namePrefix={namePrefix}
      index={idx}
      depth={depth + 1}
      shouldUnregister={shouldUnregister}
    />
  ))

  if (field.meta.section) {
    return <>{content}</>
  }

  return (
    <fieldset>
      {field.label && <legend>{field.label}</legend>}
      {content}
    </fieldset>
  )
}

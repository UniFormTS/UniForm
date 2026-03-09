import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { FieldRenderer } from '../FieldRenderer'

type ObjectFieldProps = {
  field: FieldConfig
  control: Control
  namePrefix?: string
}

export function ObjectField({ field, control, namePrefix }: ObjectFieldProps) {
  const children = field.children ?? []

  const content = children.map((child) => (
    <FieldRenderer
      key={child.name}
      field={child}
      control={control}
      namePrefix={namePrefix}
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

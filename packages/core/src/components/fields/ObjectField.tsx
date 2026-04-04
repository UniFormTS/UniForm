import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { FieldRenderer } from '../FieldRenderer'
import { useAutoFormContext } from '../../context/AutoFormContext'

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
  const { classNames, layout } = useAutoFormContext()
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

  const ObjectWrapper = layout.objectWrapper
  return (
    <ObjectWrapper
      label={field.label}
      className={classNames.objectFieldset}
      labelClassName={classNames.objectLegend}
    >
      {content}
    </ObjectWrapper>
  )
}

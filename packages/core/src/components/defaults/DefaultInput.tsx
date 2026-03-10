import * as React from 'react'
import type { FieldProps } from '../../types'

function resolveInputType(props: FieldProps): React.HTMLInputTypeAttribute {
  const metaType = props.meta.inputType
  if (typeof metaType === 'string') return metaType
  if (props.meta.component === 'date') return 'date'
  return 'text'
}

function formatValue(value: unknown): string {
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return ''
    return value.toISOString().split('T')[0]
  }
  if (value === null || value === undefined) return ''
  return String(value as string | number | boolean)
}

export function DefaultInput(props: FieldProps) {
  const { name, value, onChange, onBlur, ref, required, disabled, meta } = props
  const inputType = resolveInputType(props)

  return (
    <input
      id={name}
      name={name}
      type={inputType}
      value={formatValue(value)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      ref={ref}
      required={required}
      disabled={disabled}
      aria-required={required}
      aria-disabled={disabled}
      placeholder={meta.placeholder}
      data-input-type={inputType}
      data-required={required || undefined}
      data-disabled={disabled || undefined}
    />
  )
}

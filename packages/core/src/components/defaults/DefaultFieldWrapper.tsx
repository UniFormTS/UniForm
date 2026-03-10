import type * as React from 'react'
import type { FieldWrapperProps } from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'

export function DefaultFieldWrapper({
  children,
  field,
  error,
  span,
  index = 0,
  depth = 0,
}: FieldWrapperProps) {
  const { classNames, disabled: contextDisabled } = useAutoFormContext()

  const isDisabled = field.meta.disabled || contextDisabled
  const hasError = Boolean(error)
  const hasDescription = Boolean(field.meta.description)

  return (
    <div
      className={classNames.fieldWrapper}
      style={
        {
          '--field-span': span ?? field.meta.span ?? 1,
          '--field-index': index,
          '--field-depth': depth,
        } as React.CSSProperties
      }
      data-field-name={field.name}
      data-field-type={field.type}
      data-required={field.required || undefined}
      data-disabled={isDisabled || undefined}
      data-has-error={hasError || undefined}
      data-has-description={hasDescription || undefined}
    >
      <label htmlFor={field.name} className={classNames.label}>
        {field.label}
        {field.required && ' *'}
      </label>
      {children}
      {hasDescription && (
        <p className={classNames.description}>
          {String(field.meta.description)}
        </p>
      )}
      {error && (
        <span role='alert' className={classNames.error}>
          {error}
        </span>
      )}
    </div>
  )
}

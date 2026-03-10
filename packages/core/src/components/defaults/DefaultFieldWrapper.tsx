import type * as React from 'react'
import type { FieldWrapperProps } from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'

export function DefaultFieldWrapper({
  children,
  field,
  error,
  span,
}: FieldWrapperProps) {
  const { classNames } = useAutoFormContext()

  return (
    <div
      className={classNames.fieldWrapper}
      style={{ '--field-span': span } as React.CSSProperties}
    >
      <label htmlFor={field.name} className={classNames.label}>
        {field.label}
        {field.required && ' *'}
      </label>
      {children}
      {field.meta.description && (
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

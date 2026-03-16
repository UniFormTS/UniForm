import * as React from 'react'
import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { resolveComponent } from '../resolveComponent'

type SelectFieldProps = {
  field: Extract<FieldConfig, { type: 'select' }>
  control: Control
  effectiveName: string
  shouldUnregister?: boolean
}

export function SelectField({
  field,
  control,
  effectiveName,
  shouldUnregister,
}: SelectFieldProps) {
  const {
    registry,
    disabled: contextDisabled,
    formMethods,
  } = useAutoFormContext()
  const Component = resolveComponent(field, registry)

  if (!Component) return null

  return (
    <Controller
      name={effectiveName}
      control={control}
      shouldUnregister={shouldUnregister}
      render={({ field: rhfField, fieldState }) => (
        <Component
          name={effectiveName}
          value={(rhfField.value as unknown) ?? ''}
          onChange={(value) => {
            rhfField.onChange(value)
            field.meta.onChange?.(value, formMethods)
          }}
          onBlur={rhfField.onBlur}
          ref={rhfField.ref}
          label={field.label}
          placeholder={field.meta.placeholder}
          description={field.meta.description}
          error={fieldState.error?.message}
          required={field.required}
          disabled={field.meta.disabled || contextDisabled}
          options={field.options}
          meta={field.meta}
        />
      )}
    />
  )
}

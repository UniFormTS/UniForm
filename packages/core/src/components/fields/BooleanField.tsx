import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { resolveComponent } from '../resolveComponent'

type BooleanFieldProps = {
  field: FieldConfig
  control: Control
  effectiveName: string
}

export function BooleanField({
  field,
  control,
  effectiveName,
}: BooleanFieldProps) {
  const { registry, disabled: contextDisabled } = useAutoFormContext()
  const Component = resolveComponent(field, registry)

  if (!Component) return null

  return (
    <Controller
      name={effectiveName}
      control={control}
      render={({ field: rhfField, fieldState }) => (
        <Component
          name={effectiveName}
          value={(rhfField.value as unknown) ?? false}
          onChange={rhfField.onChange}
          onBlur={rhfField.onBlur}
          ref={rhfField.ref}
          label={field.label}
          placeholder={field.meta.placeholder}
          description={field.meta.description}
          error={fieldState.error?.message}
          required={field.required}
          disabled={field.meta.disabled || rhfField.disabled || contextDisabled}
          meta={field.meta}
        />
      )}
    />
  )
}

import { Controller } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { resolveComponent } from '../resolveComponent'
import { coerceValue } from '../../coercion/coerce'

type ScalarFieldProps = {
  field: FieldConfig
  control: Control
  effectiveName: string
}

export function ScalarField({
  field,
  control,
  effectiveName,
}: ScalarFieldProps) {
  const {
    registry,
    disabled: contextDisabled,
    coercions,
  } = useAutoFormContext()
  const Component = resolveComponent(field, registry)

  if (!Component) return null

  return (
    <Controller
      name={effectiveName}
      control={control}
      render={({ field: rhfField, fieldState }) => (
        <Component
          name={effectiveName}
          value={(rhfField.value as unknown) ?? ''}
          onChange={(value) =>
            rhfField.onChange(coerceValue(field.type, value, coercions))
          }
          onBlur={rhfField.onBlur}
          ref={rhfField.ref}
          label={field.label}
          placeholder={field.meta.placeholder}
          description={field.meta.description}
          error={fieldState.error?.message}
          required={field.required}
          disabled={field.meta.disabled || contextDisabled}
          meta={field.meta}
        />
      )}
    />
  )
}

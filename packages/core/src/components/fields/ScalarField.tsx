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
  shouldUnregister?: boolean
}

export function ScalarField({
  field,
  control,
  effectiveName,
  shouldUnregister,
}: ScalarFieldProps) {
  const {
    registry,
    disabled: contextDisabled,
    coercions,
    formMethods,
  } = useAutoFormContext()
  const Component = resolveComponent(field, registry)

  if (!Component) return null

  // Scalar inputs expect a controlled string value, so nullish RHF values are
  // normalized to `''`. Composite overrides (object/array) may legitimately
  // receive an object/array — or `undefined` when no default exists — so their
  // value is passed through unchanged.
  const isComposite = field.type === 'object' || field.type === 'array'

  return (
    <Controller
      name={effectiveName}
      control={control}
      shouldUnregister={shouldUnregister}
      render={({ field: rhfField, fieldState }) => (
        <Component
          name={effectiveName}
          value={
            isComposite
              ? (rhfField.value as unknown)
              : ((rhfField.value as unknown) ?? '')
          }
          onChange={(value) => {
            const coerced = coerceValue(field.type, value, coercions)
            rhfField.onChange(coerced)
            void field.meta.onChange?.(coerced, formMethods)
          }}
          onBlur={rhfField.onBlur}
          ref={rhfField.ref}
          label={field.label}
          placeholder={field.meta.placeholder}
          description={field.meta.description}
          error={fieldState.error?.message}
          required={field.required}
          disabled={field.meta.disabled || contextDisabled}
          options={field.meta.options}
          meta={field.meta}
          schema={field.schema}
        />
      )}
    />
  )
}

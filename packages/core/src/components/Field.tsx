import * as React from 'react'
import type { FieldComponentProps, FieldConfig } from '../types'
import { useField } from '../hooks/useField'
import { FieldRenderer } from './FieldRenderer'

function applyInstanceOverrides(
  field: FieldConfig,
  { component, label, disabled, className }: Omit<FieldComponentProps, 'name'>,
): FieldConfig {
  if (
    component === undefined &&
    label === undefined &&
    disabled === undefined &&
    !className
  ) {
    return field
  }
  const meta = { ...field.meta }
  if (component !== undefined) meta.component = component
  if (disabled !== undefined) meta.disabled = disabled
  if (className) {
    meta.className = field.meta.className
      ? `${field.meta.className} ${className}`
      : className
  }
  return { ...field, label: label ?? field.label, meta }
}

/**
 * Renders one field exactly as `<AutoForm>` would — same registry, resolved
 * config, wrapper and error — anywhere inside the `<AutoForm>` tree.
 *
 * `name` is absolute (`"address.city"`), or relative to the enclosing
 * container component (`"0.qty"`). Honours `condition` / `setCondition` on
 * the path and its ancestors, but ignores `meta.hidden` — hide a field from
 * the auto layout with `fields={{ x: { hidden: true } }}` and place it here.
 *
 * @example
 * <Field name='address.city' label='Town' className='wide' />
 */
export const Field = React.memo(function Field({
  name,
  component,
  label,
  disabled,
  className,
}: FieldComponentProps) {
  const resolved = useField(name)
  const field = resolved?.field

  const effectiveField = React.useMemo(
    () =>
      field &&
      applyInstanceOverrides(field, { component, label, disabled, className }),
    [field, component, label, disabled, className],
  )

  if (!resolved || !effectiveField || !resolved.visible) return null

  return (
    <FieldRenderer
      field={effectiveField}
      control={resolved.control}
      namePrefix={resolved.namePrefix}
      shouldUnregister={resolved.shouldUnregister}
    />
  )
})

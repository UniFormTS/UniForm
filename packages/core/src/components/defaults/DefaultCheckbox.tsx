import type { FieldProps } from '../../types'

export function DefaultCheckbox(props: FieldProps) {
  const { name, value, onChange, onBlur, required, disabled, label } = props
  const checked = Boolean(value)

  return (
    <label htmlFor={name} data-disabled={disabled || undefined}>
      <input
        id={name}
        name={name}
        type='checkbox'
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        onBlur={onBlur}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-disabled={disabled}
        data-required={required || undefined}
        data-disabled={disabled || undefined}
        data-checked={checked || undefined}
      />
      {label}
    </label>
  )
}

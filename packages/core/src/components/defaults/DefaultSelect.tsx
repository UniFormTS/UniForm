import type { FieldProps } from '../../types'

export function DefaultSelect(props: FieldProps) {
  const {
    name,
    value,
    onChange,
    onBlur,
    required,
    disabled,
    options = [],
  } = props

  return (
    <select
      id={name}
      name={name}
      value={String(value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      required={required}
      disabled={disabled}
      aria-required={required}
      aria-disabled={disabled}
      data-required={required || undefined}
      data-disabled={disabled || undefined}
    >
      {options.map((opt) => (
        <option key={String(opt.value)} value={String(opt.value)}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

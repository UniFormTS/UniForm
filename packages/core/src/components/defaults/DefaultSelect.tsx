import type { FieldProps } from '../../types'

export function DefaultSelect(props: FieldProps) {
  const {
    name,
    value,
    onChange,
    onBlur,
    ref,
    required,
    disabled,
    options = [],
  } = props

  return (
    <select
      id={name}
      name={name}
      value={String((value ?? '') as string | number)}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      ref={ref}
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

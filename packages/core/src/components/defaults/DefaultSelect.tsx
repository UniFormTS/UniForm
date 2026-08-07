import type { FieldProps, SelectOption } from '../../types'
import { createOptionIdentity } from '../../registry/optionIdentity'

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
    meta,
  } = props

  const list = options as unknown as readonly SelectOption<never>[]
  const identity = createOptionIdentity(
    name,
    list,
    meta.getOptionKey,
    meta.isOptionEqual,
  )
  const selected = identity.find(list, value)

  return (
    <select
      id={name}
      name={name}
      value={selected ? identity.keyOf(selected) : ''}
      // The DOM only carries the key; the option's raw value is what round-trips.
      onChange={(e) => {
        const picked = list.find(
          (option) => identity.keyOf(option) === e.target.value,
        )
        onChange(picked ? picked.value : e.target.value)
      }}
      onBlur={onBlur}
      ref={ref}
      required={required}
      disabled={disabled}
      aria-required={required}
      aria-disabled={disabled}
      data-required={required || undefined}
      data-disabled={disabled || undefined}
    >
      {list.map((opt) => {
        const key = identity.keyOf(opt)
        return (
          <option key={key} value={key}>
            {opt.label}
          </option>
        )
      })}
    </select>
  )
}

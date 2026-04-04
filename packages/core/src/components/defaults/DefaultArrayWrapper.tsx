import type { ArrayWrapperProps } from '../../types'

export function DefaultArrayWrapper({
  children,
  label,
  className,
  labelClassName,
}: ArrayWrapperProps) {
  return (
    <fieldset className={className}>
      {label && <legend className={labelClassName}>{label}</legend>}
      {children}
    </fieldset>
  )
}

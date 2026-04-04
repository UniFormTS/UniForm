import type { ObjectWrapperProps } from '../../types'

export function DefaultObjectWrapper({
  children,
  label,
  className,
  labelClassName,
}: ObjectWrapperProps) {
  return (
    <fieldset className={className}>
      {label && <legend className={labelClassName}>{label}</legend>}
      {children}
    </fieldset>
  )
}

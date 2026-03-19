import * as React from 'react'

export function DefaultSectionWrapper({
  children,
  title,
  className,
}: React.PropsWithChildren & { title: string; className?: string }) {
  return (
    <fieldset className={className}>
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}

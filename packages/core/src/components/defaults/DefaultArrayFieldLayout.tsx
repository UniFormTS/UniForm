import type { ArrayFieldLayoutProps } from '../../types'

export function DefaultArrayFieldLayout({
  rows,
  addButton,
}: ArrayFieldLayoutProps) {
  return (
    <>
      {rows}
      {addButton}
    </>
  )
}

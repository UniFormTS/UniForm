import * as React from 'react'

const FieldPathContext = React.createContext<string>('')

/**
 * The dot-notated path of the container currently being rendered — an array
 * row, or the subtree a custom container component owns.
 *
 * `<Field name="0.qty" />` inside a custom component rendered for `sectors`
 * resolves to `sectors.0.qty` because of this context.
 *
 * @example
 * function SectorsTable({ rowCount }: ArrayContainerProps) {
 *   const path = useFieldPath() // 'sectors'
 *   ...
 * }
 */
export function useFieldPath(): string {
  return React.useContext(FieldPathContext)
}

/** Scopes relative `<Field>` / `useField` paths to `path`. @internal */
export const FieldPathProvider = FieldPathContext.Provider

/** Joins a possibly-relative field path onto the current base path. */
export function joinFieldPath(base: string, name: string): string {
  if (!base) return name
  if (!name) return base
  return `${base}.${name}`
}

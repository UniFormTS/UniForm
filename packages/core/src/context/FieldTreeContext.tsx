import * as React from 'react'
import type { FieldConfig, SetValueOptions } from '../types'

export type FieldTree = {
  /** Field configs as the auto layout renders them: overrides, handlers, conditions and dynamic meta applied. */
  fields: FieldConfig[]
  setValue: (name: string, value: unknown, options?: SetValueOptions) => void
}

const FieldTreeContext = React.createContext<FieldTree | null>(null)

export const FieldTreeProvider = FieldTreeContext.Provider

export function useFieldTree(): FieldTree {
  const tree = React.useContext(FieldTreeContext)
  if (!tree) {
    throw new Error('[UniForm] <Field> must be used inside an <AutoForm>.')
  }
  return tree
}

/** Absolute path of the nearest container component; `<Field>` names inside it are relative to it. */
export const FieldPathContext = React.createContext('')

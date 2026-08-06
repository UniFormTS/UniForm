import * as React from 'react'
import type { Control } from 'react-hook-form'
import type {
  CoercionMap,
  ComponentRegistry,
  FieldConfig,
  FieldDependencyResult,
  FieldWrapperProps,
  ResolvedLayoutSlots,
  FormClassNames,
  ValidationMessages,
  FormLabels,
  FormMethods,
} from '../types'
import type { ArrayFieldRegistry } from '../hooks/arrayFieldRegistry'

export type AutoFormContextValue = {
  registry: ComponentRegistry
  fieldConfigs: FieldConfig[]
  fieldOverrides: Record<string, unknown>
  fieldWrapper: React.ComponentType<FieldWrapperProps>
  layout: ResolvedLayoutSlots
  classNames: FormClassNames
  disabled: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
  labels: FormLabels
  formMethods: FormMethods
  control: Control
  setDynamicMeta: React.Dispatch<
    React.SetStateAction<Record<string, Partial<FieldDependencyResult>>>
  >
  /** Live row operations published by every mounted `ArrayField`. @internal */
  arrayFields: ArrayFieldRegistry
}

const AutoFormContext = React.createContext<AutoFormContextValue | null>(null)

export function useAutoFormContext(): AutoFormContextValue {
  const ctx = React.useContext(AutoFormContext)
  if (!ctx) {
    throw new Error(
      '[UniForm] useAutoFormContext must be used inside an <AutoForm> component.',
    )
  }
  return ctx
}

export const AutoFormContextProvider = AutoFormContext.Provider

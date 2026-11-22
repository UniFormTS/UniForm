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
import type { ArrayRegistry } from './arrayRegistry'
import type { MutationType } from '../utils/reindexDynamicMeta'

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
  arrayRegistry: ArrayRegistry
  /**
   * Runs an array row operation (`run`) as one step, then applies `mutations`
   * in order, so per-row state (dynamic meta overrides and hidden-field
   * tracking) follows its rows.
   */
  runRowMutation: (
    name: string,
    mutations: MutationType | MutationType[],
    run: () => void,
  ) => void
  /**
   * Changes on each form render once `formMethods.watch(...)` has been read,
   * so components reading values that way re-render with the form.
   * @internal
   */
  watchVersion: number
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

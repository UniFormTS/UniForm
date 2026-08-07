import * as React from 'react'
import type * as z from 'zod/v4/core'
import { AutoFormContextProvider } from '../context/AutoFormContext'
import type { UniFormInstance } from '../hooks/useUniForm'
import type { AutoFormContextValue } from '../context/AutoFormContext'
import type { FieldValues } from 'react-hook-form'

export type UniFormProviderProps<TSchema extends z.$ZodObject> = {
  /** A `useUniForm()` result. */
  form: UniFormInstance<TSchema>
  children: React.ReactNode
}

/**
 * Publishes a `useUniForm` instance to the tree, so `useAutoFormContext`,
 * `useFormValue`, `useField`, `useFieldError` and `useArrayField` all resolve —
 * with no `<AutoForm>` rendered anywhere.
 *
 * `<AutoForm>` renders this internally, so nesting an `<AutoForm>` that was
 * given the same instance re-provides the same store rather than creating a
 * second one.
 *
 * @example
 * const form = useUniForm(checkoutForm, { defaultValues, onSubmit: save })
 *
 * return (
 *   <UniFormProvider form={form}>
 *     <h1>Checkout</h1>
 *     <Field name='email' />
 *     <Field name='address.city' />
 *     <button onClick={form.submit}>Pay</button>
 *   </UniFormProvider>
 * )
 */
export function UniFormProvider<TSchema extends z.$ZodObject>({
  form,
  children,
}: UniFormProviderProps<TSchema>) {
  return (
    <AutoFormContextProvider
      value={form._context as unknown as AutoFormContextValue<FieldValues>}
    >
      {children}
    </AutoFormContextProvider>
  )
}

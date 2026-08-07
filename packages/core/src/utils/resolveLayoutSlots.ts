import { createElement } from 'react'
import type { LayoutSlots, ResolvedLayoutSlots } from '../types'
import { DefaultSubmitButton } from '../components/defaults/DefaultSubmitButton'
import { DefaultFormWrapper } from '../components/defaults/DefaultFormWrapper'
import { DefaultSectionWrapper } from '../components/defaults/DefaultSectionWrapper'
import { DefaultArrayRowLayout } from '../components/defaults/DefaultArrayRowLayout'
import { DefaultArrayFieldLayout } from '../components/defaults/DefaultArrayFieldLayout'
import { DefaultObjectWrapper } from '../components/defaults/DefaultObjectWrapper'
import { DefaultArrayWrapper } from '../components/defaults/DefaultArrayWrapper'
import { DefaultArrayButton } from '../components/defaults/DefaultArrayButton'
import { DefaultArrayCollapseButton } from '../components/defaults/DefaultArrayCollapseButton'
import { resolveNullableSlot } from './resolveNullableSlot'

/**
 * Fills every layout slot with its default, honouring the `null`-means-omit
 * convention for the submit button and array action buttons.
 */
export function resolveLayoutSlots(
  layout: LayoutSlots | undefined,
): ResolvedLayoutSlots {
  const base = resolveNullableSlot(
    layout?.arrayButtons?.base,
    DefaultArrayButton,
  )
  const slots = layout?.arrayButtons
  return {
    formWrapper: layout?.formWrapper ?? DefaultFormWrapper,
    sectionWrapper: layout?.sectionWrapper ?? DefaultSectionWrapper,
    submitButton: resolveNullableSlot(
      layout?.submitButton,
      DefaultSubmitButton,
    ),
    arrayRowLayout: layout?.arrayRowLayout ?? DefaultArrayRowLayout,
    arrayFieldLayout: layout?.arrayFieldLayout ?? DefaultArrayFieldLayout,
    objectWrapper: layout?.objectWrapper ?? DefaultObjectWrapper,
    arrayWrapper: layout?.arrayWrapper ?? DefaultArrayWrapper,
    arrayButtons: {
      base,
      add: resolveNullableSlot(slots?.add, base),
      remove: resolveNullableSlot(slots?.remove, base),
      moveUp: resolveNullableSlot(slots?.moveUp, base),
      moveDown: resolveNullableSlot(slots?.moveDown, base),
      duplicate: resolveNullableSlot(slots?.duplicate, base),
      collapse: resolveNullableSlot(
        slots?.collapse,
        DefaultArrayCollapseButton,
      ),
    },
    loadingFallback: layout?.loadingFallback ?? DEFAULT_LOADING_FALLBACK,
  }
}

const DEFAULT_LOADING_FALLBACK = createElement('p', null, 'Loading…')

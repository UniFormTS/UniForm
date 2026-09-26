import * as React from 'react'
import { useWatch } from 'react-hook-form'
import { useAutoFormContext } from '../context/AutoFormContext'
import {
  chainHasCondition,
  isChainVisible,
  resolveFieldAt,
  valuesAtScope,
  type ResolvedField,
} from '../utils/resolveFieldAt'

export type LiveResolvedField = ResolvedField & {
  /** `false` while a `condition` on the path hides the field. */
  visible: boolean
  /** Whether a `condition` on the path can hide the field. */
  conditional: boolean
}

/**
 * Resolves the config at an absolute path and keeps its value-dependent parts
 * (`condition`, `requiredWhen`) live — watching values only when one exists.
 */
export function useResolvedField(path: string): LiveResolvedField | undefined {
  const { _internal, control } = useAutoFormContext()
  const resolved = React.useMemo(
    () => resolveFieldAt(_internal.resolvedFields, path),
    [_internal.resolvedFields, path],
  )

  const conditional = resolved ? chainHasCondition(resolved.chain) : false
  const requiredWhen = resolved?.config.meta.requiredWhen
  const reactive = conditional || typeof requiredWhen === 'function'

  const values = useWatch({ control, disabled: !reactive }) as unknown

  return React.useMemo(() => {
    if (!resolved) return undefined
    if (!reactive) return { ...resolved, visible: true, conditional }

    const visible = isChainVisible(resolved.chain, values)
    if (typeof requiredWhen !== 'function') {
      return { ...resolved, visible, conditional }
    }
    const required = requiredWhen(
      valuesAtScope(values, resolved.namePrefix),
      values as Record<string, unknown>,
    )
    const config =
      required === resolved.config.required
        ? resolved.config
        : { ...resolved.config, required }
    return { ...resolved, config, visible, conditional }
  }, [resolved, reactive, conditional, requiredWhen, values])
}

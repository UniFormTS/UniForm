import type { ComponentRegistry, FieldConfig, FieldProps } from '../types'
import { defaultRegistry } from '../registry/defaultRegistry'

/**
 * Resolves the React component that should be used to render a given field,
 * following this priority order:
 *
 * 1. `field.meta.component` is a direct React component → used as-is,
 *    bypassing the registry entirely.
 * 2. `field.meta.component` is a string key → looked up in the merged
 *    `registry` (factory + instance components).
 * 3. `field.type` key exists in the merged `registry`.
 * 4. `field.type` key exists in the {@link defaultRegistry}.
 * 5. No match → logs a warning and returns `null`.
 *
 * @param field - The resolved field configuration.
 * @param registry - The merged component registry for the current form instance.
 * @returns The component to render, or `null` if none could be found.
 */
export function resolveComponent(
  field: FieldConfig,
  registry: ComponentRegistry,
): React.ComponentType<FieldProps> | null {
  // 1. meta.component as a direct React component (bypasses registry)
  if (field.meta.component && typeof field.meta.component === 'function') {
    return field.meta.component as React.ComponentType<FieldProps>
  }
  // 2. meta.component as a string key in the merged registry
  if (
    typeof field.meta.component === 'string' &&
    registry[field.meta.component]
  ) {
    return registry[field.meta.component]!
  }
  // 3. field.type key in the merged registry
  if (registry[field.type]) {
    return registry[field.type]!
  }
  // 4. field.type key in the default registry
  if (defaultRegistry[field.type]) {
    return defaultRegistry[field.type]!
  }
  // 5. Unknown — render nothing
  console.warn(
    `[UniForm] No component found for field type "${field.type}"${field.meta.component ? ` with meta.component "${String(field.meta.component)}"` : ''}. Rendering null.`,
  )
  return null
}

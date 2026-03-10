import type { ComponentRegistry, FieldConfig, FieldProps } from '../types'
import { defaultRegistry } from '../registry/defaultRegistry'

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

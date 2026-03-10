import type { ComponentRegistry } from '../types'

/**
 * Merges two {@link ComponentRegistry} objects, with `overrides` taking
 * precedence over `base` for any keys that appear in both.
 *
 * Returns `base` unchanged when `overrides` is `undefined`.
 *
 * @param base - The default registry (typically the factory-level registry).
 * @param overrides - Optional per-instance registry to merge on top.
 */
export function mergeRegistries(
  base: ComponentRegistry,
  overrides?: ComponentRegistry,
): ComponentRegistry {
  if (!overrides) return base
  return { ...base, ...overrides }
}

// ---------------------------------------------------------------------------
// DeepKeys / DeepFieldValue — typed path utilities
// ---------------------------------------------------------------------------

/**
 * Extracts the element type of an array type.
 * e.g. `ArrayItem<{ name: string }[]>` → `{ name: string }`
 */
type ArrayItem<T> = T extends (infer U)[] ? U : never

/**
 * Recursively produces all valid `fields` prop keys for a given schema shape:
 *
 * - Scalar fields  → just their key (e.g. `"name"`)
 * - Object fields  → their key + all dot-notated child paths
 *                    (e.g. `"address"` | `"address.street"`)
 * - Array fields   → their key + the unprefixed keys of the item object, so
 *                    you can target every row's sub-field uniformly
 *                    (e.g. `"items"` | `"items.name"` | `"items.qty"`)
 *                    Index-based paths like `"items.0.name"` are intentionally
 *                    excluded — row count is dynamic at runtime.
 *
 * @example
 * // Given { name: string; address: { street: string }; items: { qty: number }[] }
 * // DeepKeys produces:
 * //   "name" | "address" | "address.street" | "items" | "items.qty"
 */
export type DeepKeys<T> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends unknown[]
        ? ArrayItem<T[K]> extends object
          ? K | `${K}.${DeepKeys<ArrayItem<T[K]>>}`
          : K
        : T[K] extends object
          ? K | `${K}.${DeepKeys<T[K]>}`
          : K
    }[keyof T & string]
  : never

/**
 * Resolves the value type at a dot-notated path within a type `T`.
 * Array fields use the unprefixed child path (matching `DeepKeys` convention).
 *
 * @example
 * // DeepFieldValue<{ name: string; items: { qty: number }[] }, 'items.qty'> → number
 */
export type DeepFieldValue<T, K extends string> = K extends keyof T
  ? T[K]
  : K extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T
      ? T[Head] extends (infer Item)[]
        ? DeepFieldValue<NonNullable<Item>, Tail>
        : DeepFieldValue<NonNullable<T[Head]>, Tail>
      : unknown
    : unknown

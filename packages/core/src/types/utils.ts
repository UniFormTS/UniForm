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

/**
 * Resolves the values type that a `setCondition` predicate receives for a
 * given field key `K` within form values type `TValues`.
 *
 * - **Array item fields** (e.g. `"tasks.note"`): the predicate receives the
 *   array item type (`{ title, priority, note }`), enabling row-local sibling
 *   conditions like `(row) => row.priority === 'high'`.
 * - **All other fields**: the predicate receives the full form values type.
 *
 * @example
 * // ConditionValues<{ name: string; tasks: { priority: string; note: string }[] }, 'tasks.note'>
 * // → { priority: string; note: string }
 *
 * // ConditionValues<{ name: string; address: { street: string } }, 'address.street'>
 * // → { name: string; address: { street: string } }   (full form — not an array)
 */
export type ConditionValues<
  TValues,
  K extends string,
> = K extends `${infer Head}.${string}`
  ? Head extends keyof TValues
    ? TValues[Head] extends readonly (infer Item)[]
      ? Item
      : TValues
    : TValues
  : TValues

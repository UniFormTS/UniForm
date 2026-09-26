# 01 — Arrays

## 1.1 External array control (`useArrayField`)

### Problem

`useArrayField(name)` mounts its own `useFieldArray` on the path. react-hook-form does not keep two field arrays on one path in sync, so calling `append()` from a toolbar updates the form values but no row appears.

### Requirements

- The array renderer (`ArrayField`) publishes its live row operations — `fields`, `append`, `prepend`, `insert`, `remove`, `move`, `swap`, `update`, `replace` — into a registry.
  - The registry is created **per form** and exposed on the form context. Never module-level state (two forms on a page must not collide; no SSR leaks).
  - Subscribable, so consumers re-render when an array registers, unregisters or its rows change.
- `useArrayField(name)` delegates to the registered operations when the array is rendered.
- When nothing renders the array (it is `hidden`, or replaced by a component that does not register), it falls back to writing the whole array value with `setValue`.
  - Every fallback operation reads the **current** array from the store at call time, never a value captured at render. Two `append`s in one event handler must both land.
- Reactive return values: `rowCount`, `canAdd` (below `maxItems`), `atMin` (at or below `minItems`). Min/max come from the schema.
- Nested and indexed paths resolve (`groups.0.emails`).
- Warn once when the path is not an array field.

### Acceptance

- `append`, `remove`, `insert` and `move` called from a sibling component update the rendered rows in the DOM.
- Rows added with the built-in Add button are reflected in the hook's `rowCount`.
- The fallback path works for an array marked `hidden`.
- Two `append` calls in a single handler add two rows (fallback path).

## 1.2 Arrays of primitives

### Problem

`z.array(z.string())`, `z.array(z.number())` and `z.array(z.enum([...]))` must render one input per row and round-trip plain values.

### Requirements

- One input per row, typed by the item schema: text, number, or a select for enums.
- Add appends the type's empty value: `''` for strings, `0` for numbers, the first option for enums.
- Remove and move behave as for object rows. Duplicate and collapse are **not** rendered for primitive rows.
- No per-row label by default. `meta.itemLabel: string` opts in.
  - The default field wrapper omits `<label>` entirely when the label is empty.
  - Rows without a visible label still need an accessible name: `aria-label = "${arrayLabel} ${index + 1}"`.
- Per-item validation errors appear on the failing row.
- `minItems` / `maxItems` disable Add / Remove.
- Primitive arrays nested inside object rows work.
- `useArrayField` drives primitive arrays too.

### Acceptance

- Typing updates the value at the right index; submit yields `string[]` / `number[]` / enum values.
- Add appends `''` / `0`; remove removes the right row; move reorders.
- No label by default; label shown with `meta.itemLabel`.
- Duplicate / collapse buttons are absent for primitive rows.

## 1.3 Per-row dynamic meta follows its row

### Problem

Per-row overrides set with `setFieldMeta('lines.1.sku', …)` are keyed by index. After a row operation they must move with their row — no matter whether the operation came from the built-in buttons, `useArrayField`, or a custom container component (spec 02).

### Requirements

| Operation                    | Effect on row overrides                              |
| ---------------------------- | ---------------------------------------------------- |
| `remove(i)`                  | drop row `i`, shift later rows down                  |
| `remove([...])`              | drop each index, applied highest-first               |
| `remove()`                   | clear this array's row overrides                     |
| `insert(i, v)`, `prepend(v)` | shift rows `≥ i` up by the number of inserted values |
| `move(a, b)`                 | reorder like the rows                                |
| `swap(a, b)`                 | exchange the two rows' overrides                     |
| duplicate                    | copy the source row's overrides onto the new row     |
| `replace(values)`            | clear this array's row overrides                     |
| `append`, `update`           | unchanged                                            |

Implement the wrapping once (a shared hook that mounts the field array, wraps the operations and registers them), used by both the built-in array renderer and array container components.

### Acceptance

- Set a label on row 1 via row overrides, call `remove(0)` from outside the array, and the (now) row 0 shows that label.

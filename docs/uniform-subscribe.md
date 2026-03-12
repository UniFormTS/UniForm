# UniForm: Dynamic Handler Registration & the Subscribe Problem

## The Problem

`UniForm.setOnChange` is a **set** operation — calling it replaces any existing handler for that field. This prevents the handler-accumulation bug that would occur if it were called during render.

However, if the form instance itself is created inside a component, you can still end up with stale closures or recreated instances. The recommended pattern is to define the form at module level:

```ts
// GOOD — module level, stable reference
const form = createForm(schema)
  .setOnChange('fieldA', handler)

function MyForm() {
  return <AutoForm form={form} />
}
```

```ts
// BAD — form recreated on every render
function MyForm() {
  const form = createForm(schema).setOnChange('fieldA', handler) // new instance every render
  return <AutoForm form={form} />
}
```

## Proposed Solution: `subscribe` method

Keep `setOnChange` as the static, build-time, fluent API (returns `this`). Add a separate `subscribe` method that returns an unsubscribe function, designed for dynamic/React use inside `useEffect`.

```ts
// Static — module level, fluent chaining, no cleanup needed
const form = createForm(schema)
  .setOnChange('fieldA', handler1)
  .setOnChange('fieldB', handler2)

// Dynamic — inside a component, safe via useEffect cleanup
function MyForm() {
  useEffect(() => {
    return form.subscribe('fieldA', (val, ctx) => setState(...))
  }, [])

  return <AutoForm form={form} />
}
```

### Implementation sketch

In `UniForm`:

```ts
subscribe<K extends DeepKeys<z.infer<TSchema>>>(
  field: K,
  handler: Handler<TSchema, DeepFieldValue<z.infer<TSchema>, K>>,
): () => void {
  const h = handler as Handler<TSchema, unknown>
  this._handlers.set(field, h)
  return () => {
    if (this._handlers.get(field) === h) {
      this._handlers.delete(field)
    }
  }
}
```

`setOnChange` remains unchanged (returns `this`). `subscribe` shares the same `_handlers` map but returns a cleanup function that removes the handler if it's still the active one.

---

## Future Implementation Prompt

> In `packages/core/src/UniForm.ts`, add a `subscribe` method to the `UniForm` class.
>
> **Behavior:**
>
> - Same signature as `setOnChange` but returns `() => void` (an unsubscribe function) instead of `this`.
> - Sets the handler in `_handlers` (same map `setOnChange` uses).
> - The returned unsubscribe function removes the handler only if it is still the currently active one (guard against removing a subsequently set handler).
> - `setOnChange` is unchanged — still returns `this` for chaining.
>
> **Type signature:**
>
> ```ts
> subscribe<K extends DeepKeys<z.infer<TSchema>>>(
>   field: K,
>   handler: Handler<TSchema, DeepFieldValue<z.infer<TSchema>, K>>,
> ): () => void
> ```
>
> **Also:**
>
> - Export `subscribe` as part of the public API (update any barrel exports if needed).
> - Add a JSDoc comment explaining that this is the React-safe alternative to `setOnChange` — use it inside `useEffect` so the handler is cleaned up on unmount.
> - Add a test covering: subscribe → handler fires → unsubscribe → handler no longer fires.

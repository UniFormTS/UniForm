# 06 — `addOnChange`

## Problem

`form.setOnChange(path, handler)` **replaces** the handler for a path. That is deliberate (handlers do not accumulate across re-registration), but two independently composed modules attaching behaviour to the same field silently clobber each other.

## API

```ts
form.addOnChange(path, handler) // chainable
```

`handler(value, ctx)` has the same signature and typing as for `setOnChange`, including array item paths (`'lines.sku'`, `'lines.0.sku'`) with row-scoped `ctx`.

## Requirements

- Appends to the handlers registered for `path`.
- All handlers for a path fire, in registration order, with the same arguments.
- `setOnChange` keeps its semantics: it replaces **all** handlers for that path (including ones added with `addOnChange`).

## Acceptance

- Two `addOnChange` handlers on one field both fire, in order.
- A later `setOnChange` on that field leaves only the new handler.
- Works on array item paths with the correct row context.

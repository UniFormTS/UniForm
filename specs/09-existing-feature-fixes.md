# 09 — Fixes to existing features

## 9.1 Stable defaults for omitted object props

### Problem

Omitted object props (`fields`, `classNames`, `labels`) default to fresh `{}` literals. Each render then rebuilds the field configs and the context value, re-rendering every field.

### Requirements

- Default each to a module-level constant.
- Memoised derivations (field configs, defaults, context value) must stay referentially stable across re-renders when no prop actually changed.

### Acceptance

- Re-rendering `<AutoForm>` with identical props does not re-render its fields (measure with a render counter in a custom component).

## 9.2 `onValuesChange` without re-rendering the form

### Problem

`onValuesChange` is implemented with `useWatch` on the whole form inside the form component, so the form component — and every context consumer — re-renders on every keystroke.

### Requirements

- Implement it as a subscription (`watch(callback)` inside an effect), reading the latest callback through a ref.
- Keep the contract: called once on mount with the initial values, then on every change.
- Do not subscribe at all when the prop is not provided.

### Acceptance

- The callback receives the initial values on mount and the new values after each edit.
- Typing in one field does not re-render unrelated fields (render counter).

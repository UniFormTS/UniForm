# 04 — Error tree

Depends on [03 — Runtime requiredness](./03-runtime-requiredness.md) (both extend the same resolver wrapper).

## Problem

Errors that no field renders are invisible: `superRefine` issues anchored at an array element (`['lines', 0]`), at a container (`['address']`), or with no path at all. Cross-field rules end up written twice — once in the schema, once as ad-hoc UI.

## API

- `useFieldError(path): string | undefined` — the message at **any** path: a leaf, a container, an array element (`'lines.0'`), or the form root (`''`). Relative to the enclosing container path when used inside a container component.
- `useFieldErrors(path = ''): FormIssue[]` — every error at or beneath `path`, flattened: `{ path: string; message: string; code?: string }`.
- `useFormErrors(): FieldErrors<Values>` — the whole error tree, reactive.
- `formMethods.setIssues(issues: { path: string; message: string }[])` — manual errors at any path, `''` for the root. Shaped for backend `/validate` responses.
- `<FormErrorSummary title? />` — lists the issues **no field renders** (array elements, containers, the root). Renders nothing when there are none.
- Export `FormIssue`, `FormErrorSummaryProps`.

All hooks work anywhere inside the `<AutoForm>` tree (container components, layout slots).

## Requirements

- **Placement of the summary.** Provide a way to render `<FormErrorSummary>` inside `<AutoForm>`: add a `layout.errorSummary` slot (rendered above the submit button; `null` omits it), or document placing it in `formWrapper`. Pick one and document it.
- **Root errors.** Path-less issues (and `setIssues` with `''`) are stored under a private key — **not** `'root'`: react-hook-form clears `errors.root` on every submit, which would silently drop the issue and let the form submit. Readers address it as `''`.
- **Flattening.** When collecting issues, skip the bookkeeping keys `message`, `type`, `types`, `ref` **only on an actual error node** (a node with a string `message`). Fields literally named `type` or `message` must still be collected. Never recurse into `ref` DOM elements.
- **Summary scope.** Excludes errors a rendered leaf already shows. Container paths rendered by a container component count as rendered only if the component displays its `error` prop — document this.
- **Accessibility.** The summary is a live region (`aria-live='polite'`), has a heading when `title` is given, and does not re-announce unchanged content.
- `setError` / `setErrors` keep working unchanged.

## Acceptance

- A `superRefine` issue at `['lines', 0]` is readable with `useFieldError('lines.0')` and survives re-validation.
- A path-less issue is readable at `''` and blocks submit.
- `useFieldErrors('lines.0')` returns the nested leaf errors under that row.
- `useFieldErrors('')` collects `address.type` and `address.message` for fields with those names.
- `setIssues` anchors messages at non-field paths and at the root.
- `<FormErrorSummary>` lists the array-element and root issues but not leaf errors, and renders nothing when there is nothing to report.

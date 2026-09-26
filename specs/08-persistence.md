# 08 — Persistence hardening

Keep the current synchronous `PersistStorage` interface and the `sessionStorage` default.

## Problem

Today a draft is restored with a bare `JSON.parse` merged over the defaults:

- a draft saved before a schema change is half-restored into the new shape;
- corrupt or non-object data is silently ignored or spread into the values;
- every field, including passwords and card numbers, is written;
- restore happens once per component lifetime, so changing `persistKey` (e.g. `draft-${recordId}`) never restores the new key and then overwrites it with the current values;
- a debounced write still pending after a successful submit puts the draft straight back;
- the form component re-renders on every keystroke just to schedule writes.

## API

New `<AutoForm>` props:

- `persistVersion?: number` — default `0`.
- `persistMigrate?: (persisted: unknown, fromVersion: number) => Partial<Values> | undefined`.
- `persistExclude?: DeepKeys<Values>[]`.

New form methods (ref handle and context `formMethods`):

- `hasPersistedDraft(): boolean`
- `clearPersistedData(): void`

Compatibility notes for the changelog:

- Adding members to `FormMethods` is a type-level break for code that mocks it.
- `useFormPersistence` is a public export — keep its current signature working, or ship the change as breaking.

## Requirements

- **Envelope.** Write `{ "__uniformVersion": number, "values": {...} }`. A raw object in storage (the pre-envelope format) is read as version `0`.
- **Restore** (on mount, and whenever `persistKey` changes):
  - same version → restore;
  - different version with `persistMigrate` → restore the migrated values; `undefined` → discard;
  - different version without `persistMigrate` → discard.
- **Discard** — unparseable JSON, an unmigratable version, or `values` that is not a plain object: `console.warn` naming the key, remove the entry, start from `defaultValues`. Never swallow silently, never half-restore.
- Restored values are merged over `defaultValues`.
- **Exclusions.** `persistExclude` paths are stripped on write **and** on restore. Paths address object fields (`'password'`, `'payment.cardNumber'`); array rows are not addressed individually.
- **Key changes.** Track _which key_ has been restored (not a boolean "restored once"). On a key change, restore that key's draft; write nothing under the new key until the user edits.
- **Writes.** Debounced by `persistDebounce`, triggered only by value changes after restore (not on mount), via a form-value subscription (`watch(callback)` in an effect) so the owning component does not re-render per keystroke.
- **Clearing.** After a successful submit the draft is removed automatically. `clearPersistedData()` also **cancels any pending debounced write**.
- **StrictMode.** The restore effect must be idempotent per key when effects run twice.
- `hasPersistedDraft()` is `true` only when a draft was actually restored for the current key.

## Acceptance

- A v1 draft is migrated to v2 on restore.
- An unmigratable draft is discarded with a warning and removed from storage; the form shows `defaultValues`.
- Corrupt JSON and a non-object `values` are discarded with a warning.
- A legacy unversioned draft restores as version 0.
- A written draft is a versioned envelope.
- Type then submit within the debounce window → storage is empty afterwards.
- Switching `persistKey` from `draft-1` to `draft-2` restores draft 2 and leaves it intact.
- `persistExclude: ['nickname']` → `nickname` never appears in storage.
- Restores correctly under `<React.StrictMode>`.
- `hasPersistedDraft()` / `clearPersistedData()` behave as specified.

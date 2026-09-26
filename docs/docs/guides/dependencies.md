---
title: Field Dependencies
sidebar_position: 16
description: Declare a dependency graph once and let UniForm walk the transitive closure.
---

# Field Dependencies

`setOnChange` reacts to **one** field. When fields form a chain — country → region → city, or a config matrix where three fields feed a fourth — reacting one field at a time means computing the transitive closure yourself and walking it by hand.

`setDependency` lets you declare each edge once. UniForm walks the closure, in dependency order, for **both** UI edits and programmatic writes.

## Declaring an edge

```ts
const addressForm = createForm(addressSchema)
  .setDependency('region', {
    dependsOn: 'country',
    resolve: async ({ ctx, value }) => {
      ctx.setValue('region', '')
      ctx.setFieldMeta('region', { options: await loadRegions(value) })
    },
  })
  .setDependency('city', {
    dependsOn: 'region',
    resolve: ({ ctx }) => ctx.setValue('city', ''),
  })
```

Changing `country` now resets and refetches `region` **and** `city` — the second edge is reached transitively, without `country` knowing that `city` exists.

`dependsOn` accepts one path or an array:

```ts
form.setDependency('total', {
  dependsOn: ['quantity', 'unitPrice', 'discount'],
  resolve: ({ ctx }) => {
    const { quantity, unitPrice, discount } = ctx.getValues()
    ctx.setValue('total', quantity * unitPrice * (1 - discount))
  },
})
```

### A whole graph at once

```ts
form.setDependencies({
  region: { dependsOn: 'country', resolve: resetRegion },
  city: { dependsOn: 'region', resolve: resetCity },
})
```

## What the resolver receives

```ts
resolve({ source, value, field, ctx, signal })
```

| Argument | Meaning                                                                                    |
| -------- | ------------------------------------------------------------------------------------------ |
| `source` | The field whose change **started** the propagation — not necessarily the one you depend on |
| `value`  | The value at `source` when the propagation started                                         |
| `field`  | The field being resolved (this one)                                                        |
| `ctx`    | Full programmatic control: `setValue`, `setValues`, `getValues`, `setFieldMeta`, …         |
| `signal` | An `AbortSignal`, aborted when a newer change supersedes this run                          |

`source` is the origin of the cascade, so a resolver can behave differently depending on what kicked it off.

### Async resolvers and stale responses

When `country` changes twice in quick succession, the first run is **superseded**: its `signal` aborts, and any `ctx.setValue` / `ctx.setValues` / `ctx.setFieldMeta` it makes afterwards is dropped. A slow response for the old value can never overwrite the new one. Pass the signal on to cancel the request itself:

```ts
form.setDependency('region', {
  dependsOn: 'country',
  resolve: async ({ ctx, value, signal }) => {
    const res = await fetch(`/regions?country=${value}`, { signal })
    ctx.setFieldMeta('region', { options: await res.json() })
  },
})
```

An async resolver is **awaited** before the fields downstream of it resolve, so `city` sees the `region` its resolver wrote. Synchronous graphs still resolve inline, before `setValue` returns. A rejected resolver is logged, and its downstream fields are not resolved.

## Programmatic writes participate

This is the difference from `setOnChange`, which fires only from a real UI `onChange`:

```ts
form.methods.setValue('country', 'DE') // region and city re-resolve too
```

## Cycles are rejected at registration

A cycle throws immediately, naming the path, rather than looping at runtime:

```ts
form.setDependency('country', { dependsOn: 'city', resolve })
// Error: [UniForm] setDependency("country") would create a dependency cycle:
//        country → region → city → country. Break the loop before registering.
```

The instance stays usable after the throw — the rejected edge is rolled back.

## The propagation model

One pass over the topologically-sorted closure per logical change. Writes a resolver makes through `ctx` do **not** start a second cascade, so propagation is bounded no matter how the graph is shaped. If a resolver writes a field that has its own dependents, declare that edge — do not rely on re-entrancy.

## Several handlers on one field

`setOnChange` **replaces** the handler for a field. That is deliberate — it stops handlers accumulating across renders — but it means two modules attaching behaviour to the same field silently clobber each other.

`addOnChange` is the additive form. Handlers fire in registration order:

```ts
form.addOnChange('country', loadRegions)
form.addOnChange('country', trackAnalytics) // both fire, in this order
```

Use `setOnChange` when the form owns the behaviour, `addOnChange` when composed modules each contribute some.

## Choosing between them

| Use                           | When                                                                   |
| ----------------------------- | ---------------------------------------------------------------------- |
| `setOnChange` / `addOnChange` | A single field triggers a side effect                                  |
| `setDependency`               | A field is **derived** from others, and the relationship is transitive |
| `setCondition`                | Visibility depends on values                                           |
| `setRequired`                 | Requiredness depends on values                                         |

## Live example

The playground's **Dependency Graph** example cascades country → region → city with one declaration per edge.

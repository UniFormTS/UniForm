/**
 * Arguments handed to a dependency resolver when one of its `dependsOn` fields
 * changes.
 *
 * @template TCtx - The `UniFormContext` for the form.
 */
export type DependencyArgs<TCtx> = {
  /** The field whose change started this propagation. */
  source: string
  /** The value at `source` when the propagation started. */
  value: unknown
  /** The dependent field being resolved. */
  field: string
  /** Full programmatic control of the form, plus `setFieldMeta`. */
  ctx: TCtx
}

export type DependencyEdge<TCtx> = {
  dependsOn: string[]
  resolve: (args: DependencyArgs<TCtx>) => void | Promise<void>
}

/**
 * Detects a cycle reachable from `start` in the `field -> dependents` graph and
 * returns the offending path, or `undefined` when the graph is acyclic.
 */
export function findCycle(
  dependents: Map<string, Set<string>>,
  start: string,
): string[] | undefined {
  const stack: string[] = []
  const onStack = new Set<string>()
  const visited = new Set<string>()

  const walk = (node: string): string[] | undefined => {
    if (onStack.has(node)) {
      return [...stack.slice(stack.indexOf(node)), node]
    }
    if (visited.has(node)) return undefined

    visited.add(node)
    onStack.add(node)
    stack.push(node)

    for (const next of dependents.get(node) ?? []) {
      const cycle = walk(next)
      if (cycle) return cycle
    }

    stack.pop()
    onStack.delete(node)
    return undefined
  }

  return walk(start)
}

/**
 * Every field transitively downstream of `source`, in dependency order — a
 * field always appears after everything it depends on.
 *
 * `source` itself is excluded; it is the thing that changed, not a dependent.
 */
export function resolvePropagationOrder(
  dependents: Map<string, Set<string>>,
  edges: Map<string, DependencyEdge<unknown>>,
  source: string,
): string[] {
  const reachable = new Set<string>()
  const queue = [...(dependents.get(source) ?? [])]
  while (queue.length) {
    const node = queue.shift()!
    if (reachable.has(node)) continue
    reachable.add(node)
    for (const next of dependents.get(node) ?? []) queue.push(next)
  }
  if (!reachable.size) return []

  // Topological order within the reachable set (the graph is acyclic by
  // construction — setDependency rejects cycles at registration time).
  const ordered: string[] = []
  const placed = new Set<string>()

  const visit = (node: string) => {
    if (placed.has(node)) return
    placed.add(node)
    for (const upstream of edges.get(node)?.dependsOn ?? []) {
      if (reachable.has(upstream)) visit(upstream)
    }
    ordered.push(node)
  }

  for (const node of reachable) visit(node)
  return ordered
}

import * as React from 'react'
import { useFieldErrors, type FormIssue } from '../hooks/useFieldError'
import { useAutoFormContext } from '../context/AutoFormContext'

export type FormErrorSummaryProps = {
  /** Collect errors at or beneath this path. Defaults to the whole form. */
  path?: string
  /**
   * When `true` (the default) only issues that have **no rendered field to sit
   * on** are listed — the form root and container/array-element paths. Set to
   * `false` to list every issue in the subtree.
   */
  unanchoredOnly?: boolean
  /** Heading rendered above the list when there is at least one issue. */
  title?: string
  className?: string
  /** Render your own markup instead of the default list. */
  children?: (issues: FormIssue[]) => React.ReactNode
}

/**
 * Lists validation issues that no field can render — cross-entity rules raised
 * at the form root, and `superRefine` issues anchored to a container or an
 * array element rather than a leaf.
 *
 * @example
 * <UniFormProvider form={form}>
 *   <FormErrorSummary title='Please fix the following' />
 *   <AutoForm form={form} onSubmit={save} />
 * </UniFormProvider>
 *
 * @example
 * // Scoped to one array row, with custom markup:
 * <FormErrorSummary path='lines.0' unanchoredOnly={false}>
 *   {(issues) => issues.map((i) => <Toast key={i.path} text={i.message} />)}
 * </FormErrorSummary>
 */
export function FormErrorSummary({
  path = '',
  unanchoredOnly = true,
  title,
  className,
  children,
}: FormErrorSummaryProps) {
  const { resolvedFields } = useAutoFormContext()
  const all = useFieldErrors(path)

  const leafPaths = React.useMemo(
    () => collectLeafPaths(resolvedFields),
    [resolvedFields],
  )

  const issues = unanchoredOnly
    ? all.filter((issue) => !isAnchoredToLeaf(issue.path, leafPaths))
    : all

  if (!issues.length) return null
  if (children) return <>{children(issues)}</>

  return (
    <div role='alert' className={className}>
      {title && <p>{title}</p>}
      <ul>
        {issues.map((issue) => (
          <li key={`${issue.path}:${issue.message}`}>{issue.message}</li>
        ))}
      </ul>
    </div>
  )
}

/** Field paths that render their own error, with array indexes normalised out. */
function collectLeafPaths(
  fields: { name: string; type: string }[],
  prefix = '',
  into: Set<string> = new Set(),
): Set<string> {
  for (const field of fields as {
    name: string
    type: string
    children?: { name: string; type: string }[]
    itemConfig?: { name: string; type: string }
  }[]) {
    const full = prefix ? `${prefix}.${field.name}` : field.name
    if (field.type === 'object' && field.children) {
      collectLeafPaths(field.children, prefix, into)
    } else if (field.type === 'array' && field.itemConfig) {
      const item = field.itemConfig as {
        name: string
        type: string
        children?: { name: string; type: string }[]
      }
      if (item.type === 'object' && item.children) {
        collectLeafPaths(item.children, `${full}.#`, into)
      } else {
        into.add(`${full}.#`)
      }
    } else {
      into.add(full)
    }
  }
  return into
}

function isAnchoredToLeaf(path: string, leafPaths: Set<string>): boolean {
  if (!path) return false
  return leafPaths.has(path.replace(/\.\d+(?=\.|$)/g, '.#'))
}

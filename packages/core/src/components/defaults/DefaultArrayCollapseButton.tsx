import type { ArrayCollapseButtonProps } from '../../types'

export function DefaultArrayCollapseButton({
  isCollapsed: _isCollapsed,
  ...props
}: ArrayCollapseButtonProps) {
  return <button {...props} />
}

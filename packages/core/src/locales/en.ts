import type { FormLabels } from '../types/form'

export const en: FormLabels = {
  submit: 'Submit',
  arrayAdd: 'Add',
  arrayRemove: 'Remove',
  arrayMoveUp: '↑',
  arrayMoveDown: '↓',
  arrayDuplicate: 'Duplicate',
  arrayCollapse: '▼',
  arrayExpand: '▶',
  arrayItemSummary: (i) => `Item ${i + 1}`,
  arrayAriaExpand: (i) => `Expand item ${i + 1}`,
  arrayAriaCollapse: (i) => `Collapse item ${i + 1}`,
  arrayAriaMoveUp: (i) => `Move item ${i + 1} up`,
  arrayAriaMoveDown: (i) => `Move item ${i + 1} down`,
  arrayAriaDuplicate: (i) => `Duplicate item ${i + 1}`,
  arrayAriaRemove: (i) => `Remove item ${i + 1}`,
}

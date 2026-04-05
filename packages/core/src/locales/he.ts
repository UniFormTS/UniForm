import type { FormLabels } from '../types/form'

export const he: FormLabels = {
  submit: 'שלח',
  arrayAdd: 'הוסף',
  arrayRemove: 'הסר',
  arrayMoveUp: '↑',
  arrayMoveDown: '↓',
  arrayDuplicate: 'שכפל',
  arrayCollapse: '▼',
  arrayExpand: '▶',
  arrayItemSummary: (i) => `פריט ${i + 1}`,
  arrayAriaExpand: (i) => `הרחב פריט ${i + 1}`,
  arrayAriaCollapse: (i) => `כווץ פריט ${i + 1}`,
  arrayAriaMoveUp: (i) => `הזז פריט ${i + 1} למעלה`,
  arrayAriaMoveDown: (i) => `הזז פריט ${i + 1} למטה`,
  arrayAriaDuplicate: (i) => `שכפל פריט ${i + 1}`,
  arrayAriaRemove: (i) => `הסר פריט ${i + 1}`,
}

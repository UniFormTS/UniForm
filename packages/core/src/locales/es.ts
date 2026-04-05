import type { FormLabels } from '../types/form'

export const es: FormLabels = {
  submit: 'Enviar',
  arrayAdd: 'Agregar',
  arrayRemove: 'Eliminar',
  arrayMoveUp: '↑',
  arrayMoveDown: '↓',
  arrayDuplicate: 'Duplicar',
  arrayCollapse: '▼',
  arrayExpand: '▶',
  arrayItemSummary: (i) => `Elemento ${i + 1}`,
  arrayAriaExpand: (i) => `Expandir elemento ${i + 1}`,
  arrayAriaCollapse: (i) => `Contraer elemento ${i + 1}`,
  arrayAriaMoveUp: (i) => `Mover elemento ${i + 1} arriba`,
  arrayAriaMoveDown: (i) => `Mover elemento ${i + 1} abajo`,
  arrayAriaDuplicate: (i) => `Duplicar elemento ${i + 1}`,
  arrayAriaRemove: (i) => `Eliminar elemento ${i + 1}`,
}

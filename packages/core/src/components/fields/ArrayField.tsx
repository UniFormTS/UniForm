import { useState, useMemo } from 'react'
import { useFieldArray, useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { FieldConfig } from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { FieldRenderer } from '../FieldRenderer'
import { getDefaultValue } from './getDefaultValue'

type ArrayFieldProps = {
  field: Extract<FieldConfig, { type: 'array' }>
  control: Control
  effectiveName: string
}

/**
 * Produces a short summary string for a collapsed array row.
 *
 * Scans the row's values for the first non-empty `string` or `number` child
 * field and returns it as the label. Falls back to `"Item {index + 1}"` when
 * no suitable value is found.
 *
 * @param row - The current form values for the row (shallow key-value map).
 * @param itemConfig - The field config describing the item's shape.
 * @param index - Zero-based row index, used in the fallback label.
 */
function getRowSummary(
  row: Record<string, unknown>,
  itemConfig: FieldConfig,
  index: number,
): string {
  // Try to find the first string or number value from children
  if (itemConfig.type === 'object') {
    for (const child of itemConfig.children) {
      const key = child.name.split('.').pop() ?? child.name
      const val = row[key]
      if (
        (child.type === 'string' || child.type === 'number') &&
        val != null &&
        val !== ''
      ) {
        return String(val as string | number)
      }
    }
  }
  return `Item ${index + 1}`
}

export function ArrayField({ field, control, effectiveName }: ArrayFieldProps) {
  const { classNames, layout, labels } = useAutoFormContext()
  const {
    fields: rows,
    append,
    remove,
    move,
    insert,
  } = useFieldArray({
    control,
    name: effectiveName,
  })

  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())

  const itemConfig = field.itemConfig
  const isObjectItems = itemConfig.type === 'object'
  const minItems = field.minItems
  const maxItems = field.maxItems
  const atMin = minItems != null && rows.length <= minItems
  const atMax = maxItems != null && rows.length >= maxItems

  const showMove = field.meta.movable === true
  const showDuplicate = field.meta.duplicable === true
  const showCollapse = field.meta.collapsible === true && isObjectItems

  const toggleCollapse = (index: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  // When the array belongs to a section, propagate section to the item config
  // so nested ObjectField also skips its own <fieldset>.
  const effectiveItemConfig =
    field.meta.section && !itemConfig.meta.section
      ? {
          ...itemConfig,
          meta: { ...itemConfig.meta, section: field.meta.section },
        }
      : itemConfig

  const {
    add: AddBtn,
    remove: RemoveBtn,
    moveUp: MoveUpBtn,
    moveDown: MoveDownBtn,
    duplicate: DuplicateBtn,
    collapse: CollapseBtn,
  } = layout.arrayButtons
  const ArrayFieldLayout = layout.arrayFieldLayout
  const RowLayout = layout.arrayRowLayout

  const renderedRows = rows.map((row, index) => {
    const isCollapsed = showCollapse && collapsed.has(index)

    const collapseButton = showCollapse ? (
      <CollapseBtn
        type='button'
        className={classNames.arrayCollapse}
        onClick={() => toggleCollapse(index)}
        aria-label={
          isCollapsed
            ? `Expand item ${index + 1}`
            : `Collapse item ${index + 1}`
        }
        isCollapsed={isCollapsed}
      >
        {isCollapsed
          ? (labels.arrayExpand ?? '▼')
          : (labels.arrayCollapse ?? '▶')}{' '}
        <CollapseSummary
          control={control}
          effectiveName={effectiveName}
          index={index}
          itemConfig={itemConfig}
          isCollapsed={isCollapsed}
        />
      </CollapseBtn>
    ) : null

    const moveUpButton =
      showMove && rows.length > 1 ? (
        <MoveUpBtn
          type='button'
          className={classNames.arrayMove}
          onClick={() => move(index, index - 1)}
          disabled={index === 0}
          aria-label={`Move item ${index + 1} up`}
        >
          {labels.arrayMoveUp ?? '↑'}
        </MoveUpBtn>
      ) : null

    const moveDownButton =
      showMove && rows.length > 1 ? (
        <MoveDownBtn
          type='button'
          className={classNames.arrayMove}
          onClick={() => move(index, index + 1)}
          disabled={index === rows.length - 1}
          aria-label={`Move item ${index + 1} down`}
        >
          {labels.arrayMoveDown ?? '↓'}
        </MoveDownBtn>
      ) : null

    const duplicateButton =
      showDuplicate && !atMax ? (
        <DuplicateBtn
          type='button'
          className={classNames.arrayDuplicate}
          onClick={() => {
            const values = Object.fromEntries(
              Object.entries(row).filter(([k]) => k !== 'id'),
            )
            insert(index + 1, values as Record<string, unknown>)
          }}
          aria-label={`Duplicate item ${index + 1}`}
        >
          {labels.arrayDuplicate ?? 'Duplicate'}
        </DuplicateBtn>
      ) : null

    const removeButton = (
      <RemoveBtn
        type='button'
        className={classNames.arrayRemove}
        onClick={() => remove(index)}
        disabled={atMin}
        aria-label={`Remove item ${index + 1}`}
      >
        {labels.arrayRemove ?? 'Remove'}
      </RemoveBtn>
    )

    const fieldContent = !isCollapsed ? (
      <FieldRenderer
        field={effectiveItemConfig}
        control={control}
        namePrefix={`${effectiveName}.${index}`}
      />
    ) : null

    return (
      <RowLayout
        key={row.id}
        buttons={{
          moveUp: moveUpButton,
          moveDown: moveDownButton,
          duplicate: duplicateButton,
          remove: removeButton,
          collapse: collapseButton,
        }}
        index={index}
        rowCount={rows.length}
      >
        {fieldContent}
      </RowLayout>
    )
  })

  const addButton = (
    <AddBtn
      type='button'
      className={classNames.arrayAdd}
      disabled={atMax}
      onClick={() =>
        append(getDefaultValue(itemConfig) as Record<string, unknown>)
      }
    >
      {labels.arrayAdd ?? 'Add'}
    </AddBtn>
  )

  const content = (
    <ArrayFieldLayout
      rows={renderedRows}
      addButton={addButton}
      rowCount={rows.length}
      canAdd={!atMax}
    />
  )

  if (field.meta.section) {
    return content
  }

  const ArrayWrapper = layout.arrayWrapper
  return (
    <ArrayWrapper
      label={field.label}
      className={classNames.arrayFieldset}
      labelClassName={classNames.arrayLegend}
    >
      {content}
    </ArrayWrapper>
  )
}

/** Reactive summary text for collapsed rows */
function CollapseSummary({
  control,
  effectiveName,
  index,
  itemConfig,
  isCollapsed,
}: {
  control: Control
  effectiveName: string
  index: number
  itemConfig: FieldConfig
  isCollapsed: boolean
}) {
  const rowValues = useWatch({ control, name: `${effectiveName}.${index}` }) as
    | Record<string, unknown>
    | undefined

  const summary = useMemo(() => {
    if (!isCollapsed) return `Item ${index + 1}`
    if (!rowValues) return `Item ${index + 1}`
    return getRowSummary(rowValues, itemConfig, index)
  }, [isCollapsed, rowValues, itemConfig, index])

  return <>{isCollapsed ? summary : `Item ${index + 1}`}</>
}

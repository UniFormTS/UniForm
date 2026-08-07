import { useState, useMemo, useEffect } from 'react'
import * as React from 'react'
import { useFieldArray, useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type {
  FieldConfig,
  ArrayWrapperProps,
  FormMethods,
  FieldDependencyResult,
} from '../../types'
import { useAutoFormContext } from '../../context/AutoFormContext'
import { FieldRenderer } from '../FieldRenderer'
import { getDefaultValue } from './getDefaultValue'
import { reindexDynamicMeta } from '../../utils/reindexDynamicMeta'
import type { RowAwareOnChange } from '../../utils/createRowScopedContext'
import type { ArrayFieldConfigWithRowMeta } from '../../utils/fieldPipeline'

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
  itemSummary?: (index: number) => string,
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
  return itemSummary?.(index) ?? `Item ${index + 1}`
}

/**
 * Creates a copy of the item config with each child's `meta.onChange` wrapped
 * to inject the `rowIndex` as the third argument. This bridges the gap between
 * field components (which call onChange with 2 args) and the `RowAwareOnChange`
 * handlers injected by `injectOnChangeHandlers`.
 */
function bindRowIndexToItemConfig(
  itemConfig: FieldConfig,
  rowIndex: number,
): FieldConfig {
  if (itemConfig.type !== 'object') return itemConfig

  const children = itemConfig.children.map((child) => {
    if (!child.meta.onChange) return child
    const originalOnChange = child.meta.onChange as RowAwareOnChange
    return {
      ...child,
      meta: {
        ...child.meta,
        onChange: (value: unknown, formMethods: FormMethods) => {
          void originalOnChange(value, formMethods, rowIndex)
        },
      },
    }
  })

  return { ...itemConfig, children }
}

/**
 * Merges per-row dynamic meta overrides into the child field configs of an
 * array item. For each child field that has an override in `rowOverrides`,
 * applies the override properties (hidden, disabled, label, placeholder,
 * description, options) to the child's config.
 */
function applyRowDynamicMeta(
  itemConfig: FieldConfig,
  rowOverrides: Record<string, Partial<FieldDependencyResult>>,
): FieldConfig {
  if (itemConfig.type !== 'object') return itemConfig

  const children = itemConfig.children.map((child) => {
    const override = rowOverrides[child.name]
    if (!override) return child

    const { options, label, required, ...metaOverrides } = override
    let updated: FieldConfig = {
      ...child,
      ...(label !== undefined ? { label } : {}),
      ...(required !== undefined ? { required } : {}),
      meta: { ...child.meta, ...metaOverrides },
    }

    // For select fields, override options if provided
    if (options !== undefined && updated.type === 'select') {
      updated = { ...updated, options }
    }

    return updated
  })

  return { ...itemConfig, children }
}

export function ArrayField({ field, control, effectiveName }: ArrayFieldProps) {
  const { classNames, layout, labels, setDynamicMeta, arrayFields } =
    useAutoFormContext()
  const {
    fields: rows,
    append,
    prepend,
    remove,
    move,
    swap,
    insert,
    update,
    replace,
  } = useFieldArray({
    control,
    name: effectiveName,
  })

  // Publish the live row operations so `useArrayField` can drive *this*
  // field array instead of mounting a second, desynchronised one.
  useEffect(
    () =>
      arrayFields.register(effectiveName, {
        fields: rows,
        append,
        prepend,
        insert,
        remove,
        move,
        swap,
        update,
        replace,
      }),
    [
      arrayFields,
      effectiveName,
      rows,
      append,
      prepend,
      insert,
      remove,
      move,
      swap,
      update,
      replace,
    ],
  )

  const [collapsed, setCollapsed] = useState<Set<number>>(() => new Set())

  const itemConfig = field.itemConfig
  const isObjectItems = itemConfig.type === 'object'
  const minItems = field.minItems
  const maxItems = field.maxItems
  const atMin = minItems != null && rows.length <= minItems
  const atMax = maxItems != null && rows.length >= maxItems

  const showMove = field.meta.movable === true
  const showDuplicate = field.meta.duplicable === true && isObjectItems
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
  const sectionAwareItemConfig =
    isObjectItems && field.meta.section && !itemConfig.meta.section
      ? {
          ...itemConfig,
          meta: { ...itemConfig.meta, section: field.meta.section },
        }
      : itemConfig

  // Scalar rows carry no label of their own — the array's label covers the
  // whole list. `meta.itemLabel` opts back in to a per-row label.
  const itemLabel = field.meta.itemLabel
  const effectiveItemConfig =
    !isObjectItems && typeof itemLabel === 'string'
      ? { ...sectionAwareItemConfig, label: itemLabel }
      : sectionAwareItemConfig

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

  // Read per-row dynamic meta from the field config (set by applyDynamicMeta)
  const rowDynamicMeta = (field as ArrayFieldConfigWithRowMeta)._rowDynamicMeta

  const renderedRows = rows.map((row, index) => {
    const isCollapsed = showCollapse && collapsed.has(index)

    const collapseButton =
      showCollapse && CollapseBtn ? (
        <CollapseBtn
          type='button'
          className={classNames.arrayCollapse}
          onClick={() => toggleCollapse(index)}
          aria-label={
            isCollapsed
              ? (labels.arrayAriaExpand?.(index) ?? `Expand item ${index + 1}`)
              : (labels.arrayAriaCollapse?.(index) ??
                `Collapse item ${index + 1}`)
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
      showMove && rows.length > 1 && MoveUpBtn ? (
        <MoveUpBtn
          type='button'
          className={classNames.arrayMove}
          onClick={() => {
            move(index, index - 1)
            setDynamicMeta((prev) =>
              reindexDynamicMeta(prev, effectiveName, {
                type: 'move',
                from: index,
                to: index - 1,
              }),
            )
          }}
          disabled={index === 0}
          aria-label={
            labels.arrayAriaMoveUp?.(index) ?? `Move item ${index + 1} up`
          }
        >
          {labels.arrayMoveUp ?? '↑'}
        </MoveUpBtn>
      ) : null

    const moveDownButton =
      showMove && rows.length > 1 && MoveDownBtn ? (
        <MoveDownBtn
          type='button'
          className={classNames.arrayMove}
          onClick={() => {
            move(index, index + 1)
            setDynamicMeta((prev) =>
              reindexDynamicMeta(prev, effectiveName, {
                type: 'move',
                from: index,
                to: index + 1,
              }),
            )
          }}
          disabled={index === rows.length - 1}
          aria-label={
            labels.arrayAriaMoveDown?.(index) ?? `Move item ${index + 1} down`
          }
        >
          {labels.arrayMoveDown ?? '↓'}
        </MoveDownBtn>
      ) : null

    const duplicateButton =
      showDuplicate && !atMax && DuplicateBtn ? (
        <DuplicateBtn
          type='button'
          className={classNames.arrayDuplicate}
          onClick={() => {
            const values = Object.fromEntries(
              Object.entries(row).filter(([k]) => k !== 'id'),
            )
            insert(index + 1, values as Record<string, unknown>)
            setDynamicMeta((prev) =>
              reindexDynamicMeta(prev, effectiveName, {
                type: 'duplicate',
                index,
              }),
            )
          }}
          aria-label={
            labels.arrayAriaDuplicate?.(index) ?? `Duplicate item ${index + 1}`
          }
        >
          {labels.arrayDuplicate ?? 'Duplicate'}
        </DuplicateBtn>
      ) : null

    const removeButton = RemoveBtn ? (
      <RemoveBtn
        type='button'
        className={classNames.arrayRemove}
        onClick={() => {
          remove(index)
          setDynamicMeta((prev) =>
            reindexDynamicMeta(prev, effectiveName, {
              type: 'remove',
              index,
            }),
          )
        }}
        disabled={atMin}
        aria-label={
          labels.arrayAriaRemove?.(index) ?? `Remove item ${index + 1}`
        }
      >
        {labels.arrayRemove ?? 'Remove'}
      </RemoveBtn>
    ) : null

    const fieldContent = !isCollapsed ? (
      <FieldRenderer
        field={bindRowIndexToItemConfig(
          rowDynamicMeta?.[index]
            ? applyRowDynamicMeta(effectiveItemConfig, rowDynamicMeta[index])
            : effectiveItemConfig,
          index,
        )}
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

  const addButton = AddBtn ? (
    <AddBtn
      type='button'
      className={classNames.arrayAdd}
      disabled={atMax}
      onClick={() => {
        const newIndex = rows.length
        append(getDefaultValue(itemConfig) as Record<string, unknown>)
        setDynamicMeta((prev) =>
          reindexDynamicMeta(prev, effectiveName, {
            type: 'add',
            index: newIndex,
          }),
        )
      }}
    >
      {labels.arrayAdd ?? 'Add'}
    </AddBtn>
  ) : null

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

  const ArrayWrapper =
    (field.meta.wrapper as
      | React.ComponentType<ArrayWrapperProps>
      | undefined) ?? layout.arrayWrapper
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
  const { labels } = useAutoFormContext()
  const fallback = labels.arrayItemSummary?.(index) ?? `Item ${index + 1}`

  const rowValues = useWatch({ control, name: `${effectiveName}.${index}` }) as
    | Record<string, unknown>
    | undefined

  const summary = useMemo(() => {
    if (!isCollapsed) return fallback
    if (!rowValues) return fallback
    return getRowSummary(rowValues, itemConfig, index, labels.arrayItemSummary)
  }, [
    isCollapsed,
    rowValues,
    itemConfig,
    index,
    fallback,
    labels.arrayItemSummary,
  ])

  return <>{isCollapsed ? summary : fallback}</>
}

import { useMemo } from 'react'
import type { FieldConfig } from '../types'

export type SectionGroup = {
  title: string | null
  fields: FieldConfig[]
}

/**
 * Groups a flat list of field configs into ordered section groups based on
 * each field's `meta.section` value.
 *
 * - Fields without a `meta.section` (or with a non-string value) are placed
 *   in an "ungrouped" section with `title: null`, rendered first.
 * - Named sections appear in the order their first member is encountered.
 * - The returned array is memoized and only recomputed when `fields` changes.
 *
 * @param fields - The ordered list of (already filtered/sorted) field configs.
 * @returns An array of {@link SectionGroup} objects ready to be rendered.
 */
export function useSectionGrouping(fields: FieldConfig[]): SectionGroup[] {
  return useMemo(() => {
    const ungrouped: FieldConfig[] = []
    const sectionMap = new Map<string, FieldConfig[]>()
    const sectionOrder: string[] = []

    for (const field of fields) {
      const section = field.meta.section
      if (typeof section !== 'string') {
        ungrouped.push(field)
      } else {
        if (!sectionMap.has(section)) {
          sectionMap.set(section, [])
          sectionOrder.push(section)
        }
        sectionMap.get(section)!.push(field)
      }
    }

    const groups: SectionGroup[] = []

    if (ungrouped.length > 0) {
      groups.push({ title: null, fields: ungrouped })
    }

    for (const title of sectionOrder) {
      groups.push({ title, fields: sectionMap.get(title)! })
    }

    return groups
  }, [fields])
}

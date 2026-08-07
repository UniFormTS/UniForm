import * as React from 'react'
import type { FieldValues } from 'react-hook-form'
import { useAutoFormContext } from '../context/AutoFormContext'
import { FieldRenderer } from './FieldRenderer'
import { useConditionalFields } from '../hooks/useConditionalFields'
import { useSectionGrouping } from '../hooks/useSectionGrouping'

type AutoFormRendererProps = {
  onSubmit: (event: React.BaseSyntheticEvent) => void
  isSubmitting: boolean
}

/**
 * The rendering half of `<AutoForm>` — sections, fields, layout slots and the
 * submit button. Reads everything from the AutoForm context, so it works
 * identically whether the store was created by `<AutoForm>` itself or handed
 * in from `useUniForm`.
 */
export function AutoFormRenderer({
  onSubmit,
  isSubmitting,
}: AutoFormRendererProps) {
  const { _internal, control, classNames, labels, layout } =
    useAutoFormContext()

  const visibleFields = useConditionalFields(_internal.resolvedFields, control)
  const sections = useSectionGrouping(visibleFields)

  const FormWrapper = layout.formWrapper
  const SectionWrapper = layout.sectionWrapper
  const SubmitButton = layout.submitButton

  return (
    <form noValidate className={classNames.form} onSubmit={onSubmit}>
      <FormWrapper>
        {sections.map((section) => {
          const renderedFields = section.fields.map((field, idx) => (
            <FieldRenderer
              key={field.name}
              field={field}
              control={control as never}
              index={idx}
              depth={0}
            />
          ))

          if (section.title === null) {
            return (
              <React.Fragment key='__ungrouped'>
                {renderedFields}
              </React.Fragment>
            )
          }

          const sectionConfig = _internal.layoutSlots?.sections?.[section.title]
          const PerSectionWrapper = sectionConfig?.component ?? SectionWrapper

          return (
            <PerSectionWrapper
              key={section.title}
              title={section.title}
              className={sectionConfig?.className}
            >
              {renderedFields}
            </PerSectionWrapper>
          )
        })}
        {SubmitButton ? (
          <SubmitButton
            isSubmitting={isSubmitting}
            label={labels.submit ?? 'Submit'}
          />
        ) : null}
      </FormWrapper>
    </form>
  )
}

export type { FieldValues }

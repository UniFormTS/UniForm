import * as React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type Control } from 'react-hook-form'
import type { FieldCondition, FieldConfig } from '../types'
import { useConditionalFields } from './useConditionalFields'

const detailField = (condition: FieldCondition): FieldConfig =>
  ({
    name: 'detail',
    type: 'string',
    label: 'Detail',
    required: false,
    meta: { condition },
  }) as unknown as FieldConfig

function Visible({
  fields,
  control,
}: {
  fields: FieldConfig[]
  control: Control
}) {
  const visible = useConditionalFields(fields, control)
  return <p data-testid='visible'>{visible.map((f) => f.name).join(',')}</p>
}

function Harness({ fields }: { fields: FieldConfig[] }) {
  const { control, register } = useForm({ defaultValues: { a: '' } })
  return (
    <>
      <input aria-label='a' {...register('a')} />
      <Visible fields={fields} control={control as unknown as Control} />
    </>
  )
}

describe('useConditionalFields', () => {
  it('re-evaluates after `fields` change, even when a later edit restores the earlier result', async () => {
    const user = userEvent.setup()
    const alwaysShown = [detailField(() => true)]
    const { rerender } = render(<Harness fields={alwaysShown} />)
    // An edit that keeps the field visible
    await user.type(screen.getByLabelText('a'), 'x')
    expect(screen.getByTestId('visible')).toHaveTextContent('detail')

    // Replace the condition: hidden at the current values
    const shownForY = [
      detailField((values) => (values as { a: string }).a === 'xy'),
    ]
    rerender(<Harness fields={shownForY} />)
    expect(screen.getByTestId('visible')).toBeEmptyDOMElement()

    // Visible again under the new condition
    await user.type(screen.getByLabelText('a'), 'y')
    expect(screen.getByTestId('visible')).toHaveTextContent('detail')
  })
})

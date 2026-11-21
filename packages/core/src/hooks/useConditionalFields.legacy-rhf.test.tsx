import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type Control } from 'react-hook-form'
import type { FieldConfig } from '../types'
import { useConditionalFields } from './useConditionalFields'

// Simulates react-hook-form versions whose `useWatch` has no `compute` option
// (it is ignored and the watched value is returned)
vi.mock('react-hook-form', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-hook-form')>()
  const useWatch = actual.useWatch as (props: object) => unknown
  return {
    ...actual,
    useWatch: (props: object) => useWatch({ ...props, compute: undefined }),
  }
})

const detail = {
  name: 'detail',
  type: 'string',
  label: 'Detail',
  required: false,
  meta: { condition: (value: unknown) => value === 'show' },
} as unknown as FieldConfig
const fields = [detail]

function Visible({ control }: { control: Control }) {
  const visible = useConditionalFields(fields, control, 'status')
  return <p data-testid='visible'>{visible.map((f) => f.name).join(',')}</p>
}

function Harness() {
  const { control, register } = useForm({ defaultValues: { status: '' } })
  return (
    <>
      <input aria-label='status' {...register('status')} />
      <Visible control={control as unknown as Control} />
    </>
  )
}

describe('useConditionalFields without `compute` support', () => {
  it('passes a string-valued scope to conditions', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    expect(screen.getByTestId('visible')).toBeEmptyDOMElement()

    await user.type(screen.getByLabelText('status'), 'show')
    expect(screen.getByTestId('visible')).toHaveTextContent('detail')
  })
})

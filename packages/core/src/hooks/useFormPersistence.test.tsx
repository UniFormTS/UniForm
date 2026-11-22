import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm, type Control } from 'react-hook-form'
import type { PersistStorage } from '../types'
import { useFormPersistence } from './useFormPersistence'

type Values = { name: string; age: number }

function Standalone({ storage }: { storage: PersistStorage }) {
  const { control, register, reset, watch, getValues } = useForm<Values>({
    defaultValues: { name: '', age: 0 },
  })
  useFormPersistence({
    control: control as unknown as Control,
    key: 'draft',
    debounceMs: 0,
    storage,
    reset: (values) => reset(values as Values),
    defaultValues: { name: '', age: 0 },
    // A typed form's methods are accepted as they are (checked by `tsc`)
    methods: { watch, getValues },
  })
  return <input aria-label='name' {...register('name')} />
}

describe('useFormPersistence with `methods`', () => {
  it('saves a typed form through its subscription', async () => {
    const store = new Map<string, string>()
    const storage: PersistStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
      removeItem: (key) => void store.delete(key),
    }
    const user = userEvent.setup()
    render(<Standalone storage={storage} />)

    await user.type(screen.getByLabelText('name'), 'Ada')

    await waitFor(() =>
      expect(JSON.parse(store.get('draft') ?? '{}')).toMatchObject({
        name: 'Ada',
      }),
    )
  })
})

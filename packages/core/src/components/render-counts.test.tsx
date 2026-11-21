import * as React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createForm } from '../UniForm'
import { DefaultInput } from './defaults/DefaultInput'
import { DefaultCheckbox } from './defaults/DefaultCheckbox'
import { DefaultSelect } from './defaults/DefaultSelect'
import { DefaultObjectWrapper } from './defaults/DefaultObjectWrapper'
import { DefaultArrayRowLayout } from './defaults/DefaultArrayRowLayout'
import { DefaultFieldWrapper } from './defaults/DefaultFieldWrapper'
import type {
  AutoFormHandle,
  ArrayRowLayoutProps,
  FieldProps,
  FieldWrapperProps,
  FormWrapperProps,
  ObjectWrapperProps,
  PersistStorage,
} from '../types'

// ---------------------------------------------------------------------------
// Render counting. Each layout slot / field component bumps a counter when it
// renders; tests compare the counters before and after an action.
// ---------------------------------------------------------------------------

let renders: Record<string, number> = {}
const bump = (key: string) => {
  renders[key] = (renders[key] ?? 0) + 1
}
const count = (key: string) => renders[key] ?? 0
/** Total renders of every key except those listed. */
const othersThan = (...keys: string[]) =>
  Object.entries(renders)
    .filter(([key]) => !keys.includes(key))
    .reduce((sum, [, n]) => sum + n, 0)

const counted =
  (Component: React.ComponentType<FieldProps>) => (props: FieldProps) => {
    bump(props.name)
    return <Component {...props} />
  }

const components = {
  string: counted(DefaultInput),
  number: counted(DefaultInput),
  boolean: counted(DefaultCheckbox),
  select: counted(DefaultSelect),
}

const layout = {
  formWrapper: ({ children }: FormWrapperProps) => {
    bump('root')
    return <>{children}</>
  },
  objectWrapper: (props: ObjectWrapperProps) => {
    bump('objectWrapper')
    return <DefaultObjectWrapper {...props} />
  },
  arrayRowLayout: (props: ArrayRowLayoutProps) => {
    bump('arrayRow')
    return <DefaultArrayRowLayout {...props} />
  },
}

const fieldWrapper = (props: FieldWrapperProps) => {
  bump(`wrapper:${props.field.name}`)
  return <DefaultFieldWrapper {...props} />
}

// ~10 fields: scalars, a select, a boolean, an object and an array of objects
const schema = z.object({
  first: z.string().min(1),
  last: z.string().min(1),
  email: z.string().min(1),
  age: z.number(),
  agree: z.boolean(),
  role: z.enum(['a', 'b']),
  address: z.object({ street: z.string().min(1), city: z.string().min(1) }),
  tasks: z.array(z.object({ title: z.string().min(1), done: z.boolean() })),
})

const twoRows = {
  tasks: [
    { title: '', done: false },
    { title: '', done: false },
  ],
}

function renderForm(
  props: Partial<React.ComponentProps<typeof AutoForm>> = {},
  configure?: (form: ReturnType<typeof createForm<typeof schema>>) => void,
) {
  const form = createForm(schema)
  configure?.(form)
  const user = userEvent.setup()
  render(
    <AutoForm
      form={form}
      defaultValues={twoRows}
      components={components}
      layout={layout}
      fieldWrapper={fieldWrapper}
      onSubmit={() => {}}
      {...(props as object)}
    />,
  )
  renders = {}
  return user
}

const input = (name: RegExp) => screen.getByRole('textbox', { name })
const titleInput = (row: number) =>
  screen.getAllByRole('textbox', { name: /title/i })[row]

beforeEach(() => {
  renders = {}
})

describe('render counts', () => {
  it('typing in one field re-renders only that field', async () => {
    const user = renderForm()
    await user.type(input(/^first/i), 'abc')

    expect(count('root')).toBe(0)
    expect(count('objectWrapper')).toBe(0)
    expect(count('arrayRow')).toBe(0)
    expect(count('wrapper:first')).toBe(0)
    // The typed field's component re-renders once per keystroke (Controller)
    expect(count('first')).toBe(3)
    expect(othersThan('first')).toBe(0)
  })

  it('typing in an array row re-renders only that row field', async () => {
    const user = renderForm()
    await user.type(titleInput(1), 'abc')

    expect(count('tasks.1.title')).toBe(3)
    expect(othersThan('tasks.1.title')).toBe(0)
  })

  it('onValuesChange still fires on mount and on every change', async () => {
    const onValuesChange = vi.fn<(values: unknown) => void>()
    const user = renderForm({ onValuesChange })
    await waitFor(() => expect(onValuesChange).toHaveBeenCalled())
    expect(onValuesChange.mock.calls[0][0]).toMatchObject({ first: '' })
    onValuesChange.mockClear()

    await user.type(input(/^first/i), 'abc')

    expect(onValuesChange).toHaveBeenCalledTimes(3)
    expect(
      onValuesChange.mock.calls.map((c) => (c[0] as { first: string }).first),
    ).toEqual(['a', 'ab', 'abc'])
    expect(count('root')).toBe(0)
    expect(othersThan('first')).toBe(0)
  })

  it('onValuesChange reports values its own mount call writes', async () => {
    const ref = React.createRef<AutoFormHandle>()
    const onValuesChange = vi.fn<(values: unknown) => void>((values) => {
      if ((values as { first: string }).first === '') {
        ref.current?.setValue('first', 'initial')
      }
    })
    renderForm({ onValuesChange, ref } as Partial<
      React.ComponentProps<typeof AutoForm>
    >)

    await waitFor(() =>
      expect(onValuesChange.mock.lastCall?.[0]).toMatchObject({
        first: 'initial',
      }),
    )
  })

  it('persistence still saves values without re-rendering the form', async () => {
    const store = new Map<string, string>()
    const storage: PersistStorage = {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => void store.set(key, value),
      removeItem: (key) => void store.delete(key),
    }
    const user = renderForm({
      persistKey: 'perf',
      persistDebounce: 0,
      persistStorage: storage,
    })
    await user.type(input(/^first/i), 'abc')

    await waitFor(() =>
      expect(JSON.parse(store.get('perf') ?? '{}')).toMatchObject({
        first: 'abc',
      }),
    )
    expect(count('root')).toBe(0)
    expect(othersThan('first')).toBe(0)
  })

  it('a validation error change re-renders only the affected field', async () => {
    const user = renderForm()
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(1),
    )
    renders = {}

    await user.type(titleInput(0), 'x')

    // Re-validation clears only this field's error
    expect(count('tasks.0.title')).toBeGreaterThan(0)
    expect(count('wrapper:tasks.0.title')).toBeGreaterThan(0)
    expect(othersThan('tasks.0.title', 'wrapper:tasks.0.title')).toBe(0)
  })

  it('a condition re-renders the form only when visibility changes', async () => {
    const user = renderForm({}, (form) =>
      form.setCondition('email', (values) => values.first !== 'hide'),
    )
    await user.type(input(/^first/i), 'hid')
    expect(count('root')).toBe(0)
    expect(othersThan('first')).toBe(0)

    await user.type(input(/^first/i), 'e')
    expect(screen.queryByRole('textbox', { name: /email/i })).toBeNull()
    expect(count('root')).toBe(1)

    await user.type(input(/^first/i), '{Backspace}')
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument()
  })

  it('a condition inside an object re-renders only that object', async () => {
    const user = renderForm({}, (form) =>
      form.setCondition('address.city', (values) => values.first !== 'x'),
    )
    await user.type(input(/^first/i), 'x')

    expect(screen.queryByRole('textbox', { name: /city/i })).toBeNull()
    expect(count('root')).toBe(0)
    expect(count('objectWrapper')).toBe(1)
  })

  it('row conditions receive the row values and only re-render that row', async () => {
    const user = renderForm({}, (form) =>
      form.setCondition('tasks.title', (row) => !row.done),
    )
    await user.click(screen.getAllByRole('checkbox', { name: /done/i })[0])

    expect(screen.getAllByRole('textbox', { name: /title/i })).toHaveLength(1)
    expect(count('root')).toBe(0)
    expect(count('tasks.1.title')).toBe(0)
    expect(count('tasks.1.done')).toBe(0)
  })

  it.each([
    ['without row handlers', undefined],
    [
      'with a row onChange handler',
      (form: ReturnType<typeof createForm<typeof schema>>) =>
        form.setOnChange('tasks.title', () => {}),
    ],
  ] as const)(
    'adding an array row does not re-render existing rows (%s)',
    async (_, configure) => {
      const user = renderForm({}, configure)
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(screen.getAllByRole('textbox', { name: /title/i })).toHaveLength(3)
      expect(count('root')).toBe(0)
      expect(count('tasks.0.title')).toBe(0)
      expect(count('tasks.1.title')).toBe(0)
      expect(count('first')).toBe(0)
      // Only the new row's object renders
      expect(count('objectWrapper')).toBe(1)
    },
  )

  it('row onChange handlers stay scoped to their row', async () => {
    const onTitle = vi.fn()
    const user = renderForm({}, (form) =>
      form.setOnChange('tasks.title', (value, ctx) => {
        onTitle(value, (ctx.getValues() as unknown as { title: string }).title)
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(titleInput(2), 'z')
    await user.type(titleInput(0), 'y')

    // The scoped context reads the handler's own row
    expect(onTitle.mock.calls).toEqual([
      ['z', 'z'],
      ['y', 'y'],
    ])
  })
})

import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { createForm } from '../UniForm'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

const submit = () => screen.getByRole('button', { name: /submit/i })

describe('field defaults', () => {
  it('submits untouched nested booleans and selects without errors', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({
          news: z.boolean(),
          color: z.enum(['red', 'blue']),
          inner: z.object({ deep: z.boolean() }),
        }),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: false, color: 'red', inner: { deep: false } },
    })
    expect(screen.queryAllByRole('alert')).toHaveLength(0)
  })

  it('merges user defaultValues over generated nested defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({ prefs: z.object({ news: z.boolean(), name: z.string() }) }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ prefs: { news: true, name: 'Ada' } }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: true, name: 'Ada' },
    })
  })

  it('deep-merges partial nested defaultValues with generated defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({ news: z.boolean(), color: z.enum(['red', 'blue']) }),
      }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ prefs: { news: true } as never }}
        onSubmit={onSubmit}
      />,
    )
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: true, color: 'red' },
    })
  })

  it('deep-merges async defaultValues with generated nested defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        prefs: z.object({ news: z.boolean(), color: z.enum(['red', 'blue']) }),
      }),
    )
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={() =>
          Promise.resolve({ prefs: { news: true } as never })
        }
        onSubmit={onSubmit}
      />,
    )
    await user.click(await screen.findByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      prefs: { news: true, color: 'red' },
    })
  })

  it('gives fields of a non-first union variant their defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.discriminatedUnion('kind', [
        z.object({ kind: z.literal('a'), x: z.string() }),
        z.object({
          kind: z.literal('b'),
          flag: z.boolean(),
          color: z.enum(['red', 'blue']),
        }),
      ]),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.selectOptions(screen.getByRole('combobox'), 'b')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    // Other variants' keys are stripped by the union schema on submit
    expect(onSubmit.mock.calls[0][0]).toEqual({
      kind: 'b',
      flag: false,
      color: 'red',
    })
  })

  it('allows an optional formatted string to be left blank', async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ email: z.string().email().optional() }))
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({})
  })

  it('allows an optional formatted string to be cleared after typing', async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ email: z.string().email().optional() }))
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    const input = container.querySelector('[name="email"]') as HTMLInputElement
    await user.type(input, 'abc')
    await user.clear(input)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({})
  })

  it('submits null for a cleared nullable string', async () => {
    const onSubmit = vi.fn()
    const form = createForm(z.object({ middle: z.string().nullable() }))
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    const input = container.querySelector('[name="middle"]') as HTMLInputElement
    await user.type(input, 'J')
    await user.clear(input)
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({ middle: null })
  })

  it('uses schema .default() values as initial values', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        greeting: z.string().default('hello'),
        count: z.number().default(5),
        agree: z.boolean().default(true),
      }),
    )
    const { user, container } = setup(
      <AutoForm form={form} onSubmit={onSubmit} />,
    )
    expect(
      (container.querySelector('[name="greeting"]') as HTMLInputElement).value,
    ).toBe('hello')
    expect(
      (container.querySelector('[name="count"]') as HTMLInputElement).value,
    ).toBe('5')
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      greeting: 'hello',
      count: 5,
      agree: true,
    })
  })

  it('appends array rows using the same defaults', async () => {
    const onSubmit = vi.fn()
    const form = createForm(
      z.object({
        items: z.array(
          z.object({
            name: z.string().default('new'),
            note: z.string().email().optional(),
            done: z.boolean(),
          }),
        ),
      }),
    )
    const { user } = setup(<AutoForm form={form} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(submit())
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toEqual({
      items: [{ name: 'new', done: false }],
    })
  })
})

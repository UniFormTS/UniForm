import * as React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as z from 'zod/v4'
import { AutoForm } from './AutoForm'
import { UniFormProvider } from './UniFormProvider'
import { createForm } from '../UniForm'
import { useUniForm } from '../hooks/useUniForm'
import { createAutoForm } from '../factory/createAutoForm'
import { createOptionIdentity } from '../registry/optionIdentity'
import type { AutoFormHandle, FieldProps, PersistStorage } from '../types'

function setup(ui: React.ReactElement) {
  return { user: userEvent.setup(), ...render(ui) }
}

// ---------------------------------------------------------------------------
// W8 — setValue options and batched setValues
// ---------------------------------------------------------------------------

describe('setValue options / batched setValues (W8)', () => {
  /** Counts full-schema validation passes. */
  function countingSchema(onValidate: () => void) {
    return z
      .object({ a: z.string(), b: z.string(), c: z.string() })
      .superRefine(() => {
        onValidate()
      }) as unknown as z.ZodObject
  }

  function Harness({
    onValidate,
    onReady,
  }: {
    onValidate: () => void
    onReady: (handle: AutoFormHandle) => void
  }) {
    const form = React.useMemo(
      () => createForm(countingSchema(onValidate)),
      [onValidate],
    )
    const ref = React.useRef<AutoFormHandle | null>(null)
    React.useEffect(() => {
      if (ref.current) onReady(ref.current)
    })
    return (
      <AutoForm
        ref={ref as never}
        form={form}
        defaultValues={{ a: '', b: '', c: '' } as never}
        onSubmit={vi.fn()}
      />
    )
  }

  function mount() {
    const validations = vi.fn()
    let handle: AutoFormHandle | undefined
    render(
      <Harness
        onValidate={validations}
        onReady={(h) => {
          handle = h
        }}
      />,
    )
    return {
      validations,
      get handle() {
        return handle!
      },
    }
  }

  it('setValue with shouldValidate: false triggers zero validations', async () => {
    const ctx = mount()
    ctx.validations.mockClear()

    ctx.handle.setValue('a', 'x', { shouldValidate: false })
    await waitFor(() => expect(ctx.handle.getValues().a).toBe('x'))
    expect(ctx.validations).not.toHaveBeenCalled()
  })

  it('setValue without options keeps validating and dirtying', async () => {
    const ctx = mount()
    ctx.validations.mockClear()

    ctx.handle.setValue('a', 'x')
    await waitFor(() => expect(ctx.validations).toHaveBeenCalled())
  })

  it('setValues with N keys triggers exactly one validation', async () => {
    const ctx = mount()
    ctx.validations.mockClear()

    ctx.handle.setValues({ a: '1', b: '2', c: '3' })
    await waitFor(() => expect(ctx.validations).toHaveBeenCalledTimes(1))
    expect(ctx.handle.getValues()).toMatchObject({ a: '1', b: '2', c: '3' })
  })

  it('setValues with shouldValidate: false triggers none', async () => {
    const ctx = mount()
    ctx.validations.mockClear()

    ctx.handle.setValues({ a: '1', b: '2' }, { shouldValidate: false })
    await waitFor(() => expect(ctx.handle.getValues().a).toBe('1'))
    expect(ctx.validations).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// W9 — declarative dependency graph
// ---------------------------------------------------------------------------

describe('dependency graph (W9)', () => {
  const chainSchema = z.object({
    country: z.string(),
    region: z.string(),
    city: z.string(),
  })

  function buildChain(log: string[]) {
    return createForm(chainSchema)
      .setDependency('region', {
        dependsOn: 'country',
        resolve: ({ ctx, source, value }) => {
          log.push(`region<-${source}:${String(value)}`)
          ctx.setValue('region', '')
        },
      })
      .setDependency('city', {
        dependsOn: 'region',
        resolve: ({ ctx }) => {
          log.push('city')
          ctx.setValue('city', '')
        },
      })
  }

  const inputFor = (name: string) =>
    screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === name)!

  it('propagates transitively from a UI change', async () => {
    const log: string[] = []
    const { user } = setup(
      <AutoForm
        form={buildChain(log)}
        defaultValues={{ country: '', region: 'Bavaria', city: 'Munich' }}
        onSubmit={vi.fn()}
      />,
    )

    await user.type(inputFor('country'), 'DE')

    await waitFor(() => expect(inputFor('region')).toHaveValue(''))
    expect(inputFor('city')).toHaveValue('')
    expect(log.filter((l) => l.startsWith('region<-')).length).toBeGreaterThan(
      0,
    )
    expect(log).toContain('city')
  })

  it('propagates from a programmatic setValue', async () => {
    const log: string[] = []
    function App() {
      const form = useUniForm(buildChain(log), {
        defaultValues: { country: '', region: 'Bavaria', city: 'Munich' },
      })
      return (
        <div>
          <button
            type='button'
            onClick={() => form.methods.setValue('country', 'DE')}
          >
            set-country
          </button>
          <AutoForm form={form} onSubmit={vi.fn()} />
        </div>
      )
    }
    const { user } = setup(<App />)

    await user.click(screen.getByRole('button', { name: 'set-country' }))

    await waitFor(() => expect(inputFor('region')).toHaveValue(''))
    expect(inputFor('city')).toHaveValue('')
  })

  it('resolves in dependency order', async () => {
    const log: string[] = []
    const { user } = setup(
      <AutoForm
        form={buildChain(log)}
        defaultValues={{ country: '', region: 'r', city: 'c' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(inputFor('country'), 'D')
    await waitFor(() => expect(log).toContain('city'))

    const regionAt = log.findIndex((l) => l.startsWith('region<-'))
    const cityAt = log.indexOf('city')
    expect(regionAt).toBeLessThan(cityAt)
  })

  it('hands the resolver the source path and value', async () => {
    const seen: { source: string; value: unknown; field: string }[] = []
    const form = createForm(chainSchema).setDependency('region', {
      dependsOn: 'country',
      resolve: ({ source, value, field }) => {
        seen.push({ source, value, field })
      },
    })
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ country: '', region: '', city: '' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(inputFor('country'), 'X')
    await waitFor(() => expect(seen.length).toBeGreaterThan(0))
    expect(seen[0]).toMatchObject({ source: 'country', field: 'region' })
    expect(seen[0].value).toBe('X')
  })

  it('rejects a cycle at registration time, naming the path', () => {
    const form = createForm(chainSchema)
      .setDependency('region', { dependsOn: 'country', resolve: () => {} })
      .setDependency('city', { dependsOn: 'region', resolve: () => {} })

    expect(() =>
      form.setDependency('country', { dependsOn: 'city', resolve: () => {} }),
    ).toThrowError(/dependency cycle/i)

    try {
      form.setDependency('country', { dependsOn: 'city', resolve: () => {} })
    } catch (error) {
      expect((error as Error).message).toContain('country')
      expect((error as Error).message).toContain('city')
    }
  })

  it('rejects a self-dependency', () => {
    expect(() =>
      createForm(chainSchema).setDependency('region', {
        dependsOn: 'region',
        resolve: () => {},
      }),
    ).toThrowError(/dependency cycle/i)
  })

  it('stays usable after a rejected registration', async () => {
    const log: string[] = []
    const form = buildChain(log)
    expect(() =>
      form.setDependency('country', { dependsOn: 'city', resolve: () => {} }),
    ).toThrow()

    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ country: '', region: 'r', city: 'c' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(inputFor('country'), 'D')
    await waitFor(() => expect(inputFor('region')).toHaveValue(''))
  })

  it('setDependencies registers a whole graph', async () => {
    const log: string[] = []
    const form = createForm(chainSchema).setDependencies({
      region: {
        dependsOn: 'country',
        resolve: ({ ctx }) => {
          log.push('region')
          ctx.setValue('region', '')
        },
      },
      city: {
        dependsOn: 'region',
        resolve: ({ ctx }) => {
          log.push('city')
          ctx.setValue('city', '')
        },
      },
    })
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ country: '', region: 'r', city: 'c' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(inputFor('country'), 'D')
    await waitFor(() => expect(log).toContain('city'))
    expect(inputFor('city')).toHaveValue('')
  })

  it('a dependent write does not start a second cascade', async () => {
    const resolves: string[] = []
    const form = createForm(chainSchema).setDependency('region', {
      dependsOn: 'country',
      resolve: ({ ctx }) => {
        resolves.push('region')
        // Writing the field we depend on must not re-enter the cascade.
        ctx.setValue('country', 'looped')
      },
    })
    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ country: '', region: '', city: '' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(inputFor('country'), 'D')
    await waitFor(() => expect(resolves.length).toBeGreaterThan(0))
    expect(resolves.length).toBe(1)
  })
})

describe('addOnChange (W9)', () => {
  const schema = z.object({ country: z.string(), note: z.string() })

  it('fires every added handler in registration order', async () => {
    const calls: string[] = []
    const form = createForm(schema)
      .addOnChange('country', () => {
        calls.push('first')
      })
      .addOnChange('country', () => {
        calls.push('second')
      })

    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ country: '', note: '' }}
        onSubmit={vi.fn()}
      />,
    )
    const country = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'country')!
    await user.type(country, 'D')

    await waitFor(() => expect(calls).toEqual(['first', 'second']))
  })

  it('setOnChange still replaces, preserving today’s semantics', async () => {
    const calls: string[] = []
    const form = createForm(schema)
    form.addOnChange('country', () => {
      calls.push('added')
    })
    form.setOnChange('country', () => {
      calls.push('replaced')
    })

    const { user } = setup(
      <AutoForm
        form={form}
        defaultValues={{ country: '', note: '' }}
        onSubmit={vi.fn()}
      />,
    )
    const country = screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'country')!
    await user.type(country, 'D')

    await waitFor(() => expect(calls).toEqual(['replaced']))
  })
})

// ---------------------------------------------------------------------------
// W10 — rich option identity
// ---------------------------------------------------------------------------

describe('option identity (W10)', () => {
  type CompositeId = { col1: string; col2: number }

  const compositeSchema = z.object({
    target: z.object({ col1: z.string(), col2: z.number() }),
  })

  const options = [
    { label: 'Alpha', value: { col1: 'a', col2: 1 } },
    { label: 'Beta', value: { col1: 'b', col2: 2 } },
  ] as unknown as { label: string; value: string | number }[]

  const keyOf = (option: { value: unknown }) => {
    const v = option.value as CompositeId
    return `${v.col1}:${v.col2}`
  }

  it('round-trips a composite value through onChange', async () => {
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(compositeSchema)}
        defaultValues={{ target: { col1: 'a', col2: 1 } }}
        fields={{
          target: {
            component: 'select',
            options,
            getOptionKey: keyOf,
            isOptionEqual: (a, b) =>
              keyOf({ value: a }) === keyOf({ value: b }),
          },
        }}
        onSubmit={onSubmit}
      />,
    )

    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('a:1')

    await user.selectOptions(select, 'b:2')
    await user.click(screen.getByRole('button', { name: /submit/i }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        target: { col1: 'b', col2: 2 },
      }),
    )
  })

  it('re-selects the right option on re-render', async () => {
    const { user } = setup(
      <AutoForm
        form={createForm(compositeSchema)}
        defaultValues={{ target: { col1: 'a', col2: 1 } }}
        fields={{
          target: { component: 'select', options, getOptionKey: keyOf },
        }}
        onSubmit={vi.fn()}
      />,
    )
    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'b:2')
    await waitFor(() => expect(select).toHaveValue('b:2'))
  })

  it('scalar options behave exactly as before', async () => {
    const schema = z.object({ role: z.enum(['admin', 'editor']) })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ role: 'admin' }}
        onSubmit={onSubmit}
      />,
    )
    const select = screen.getByRole('combobox')
    expect(select).toHaveValue('admin')
    await user.selectOptions(select, 'editor')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ role: 'editor' }),
    )
  })

  it('preserves numeric option values instead of stringifying them', async () => {
    const schema = z.object({ level: z.number() })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ level: 1 }}
        fields={{
          level: {
            component: 'select',
            options: [
              { label: 'One', value: 1 },
              { label: 'Two', value: 2 },
            ],
          },
        }}
        onSubmit={onSubmit}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox'), '2')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ level: 2 }))
  })

  it('throws a clear error naming the field for an object value with no key fn', () => {
    expect(() =>
      createOptionIdentity(
        'target',
        options as unknown as { label: string; value: never }[],
      ),
    ).toThrowError(/target[\s\S]*getOptionKey/)
  })

  it('throws a clear error naming the field on a duplicate key', () => {
    expect(() =>
      createOptionIdentity('role', [
        { label: 'A', value: 'dupe' },
        { label: 'B', value: 'dupe' },
      ] as unknown as { label: string; value: never }[]),
    ).toThrowError(/role[\s\S]*same key "dupe"/)
  })

  it('accepts factory-level option identity', async () => {
    const Configured = createAutoForm({ getOptionKey: keyOf })
    const onSubmit = vi.fn()
    const { user } = setup(
      <Configured
        form={createForm(compositeSchema)}
        defaultValues={{ target: { col1: 'a', col2: 1 } }}
        fields={{ target: { component: 'select', options } }}
        onSubmit={onSubmit}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox'), 'b:2')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ target: { col1: 'b', col2: 2 } }),
    )
  })

  it('per-field meta wins over the factory default', () => {
    const Configured = createAutoForm({ getOptionKey: () => 'always-same' })
    render(
      <Configured
        form={createForm(compositeSchema)}
        defaultValues={{ target: { col1: 'a', col2: 1 } }}
        fields={{
          target: { component: 'select', options, getOptionKey: keyOf },
        }}
        onSubmit={vi.fn()}
      />,
    )
    expect(
      Array.from(screen.getByRole('combobox').querySelectorAll('option')).map(
        (o) => o.value,
      ),
    ).toEqual(['a:1', 'b:2'])
  })

  it('works for enum rows inside a primitive array', async () => {
    const schema = z.object({
      roles: z.array(z.enum(['admin', 'editor'])),
    })
    const onSubmit = vi.fn()
    const { user } = setup(
      <AutoForm
        form={createForm(schema)}
        defaultValues={{ roles: ['admin'] }}
        onSubmit={onSubmit}
      />,
    )
    await user.selectOptions(screen.getByRole('combobox'), 'editor')
    await user.click(screen.getByRole('button', { name: /submit/i }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ roles: ['editor'] }),
    )
  })
})

// ---------------------------------------------------------------------------
// W11 — persistence beyond a single <AutoForm>
// ---------------------------------------------------------------------------

describe('persistence (W11)', () => {
  const schema = z.object({ name: z.string(), nickname: z.string() })
  const form = createForm(schema)

  function makeStorage(seed?: Record<string, string>): PersistStorage & {
    dump: () => Record<string, string>
  } {
    const store = new Map(Object.entries(seed ?? {}))
    return {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => void store.set(k, v),
      removeItem: (k) => void store.delete(k),
      dump: () => Object.fromEntries(store),
    }
  }

  const nameInput = () =>
    screen
      .getAllByRole('textbox')
      .find((el) => el.getAttribute('name') === 'name')!

  it('migrates a v1 draft to v2 on restore', async () => {
    const storage = makeStorage({
      draft: JSON.stringify({
        __uniformVersion: 1,
        values: { fullName: 'Ada Lovelace' },
      }),
    })

    render(
      <AutoForm
        form={form}
        persistKey='draft'
        persistStorage={storage}
        persistVersion={2}
        persistMigrate={(persisted, fromVersion) => {
          if (fromVersion !== 1) return undefined
          const old = persisted as { fullName?: string }
          const [name = '', nickname = ''] = (old.fullName ?? '').split(' ')
          return { name, nickname }
        }}
        defaultValues={{ name: '', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )

    await waitFor(() => expect(nameInput()).toHaveValue('Ada'))
  })

  it('discards an unmigratable draft with a warning and starts from defaults', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const storage = makeStorage({
      draft: JSON.stringify({ __uniformVersion: 1, values: { name: 'Stale' } }),
    })

    render(
      <AutoForm
        form={form}
        persistKey='draft'
        persistStorage={storage}
        persistVersion={2}
        persistMigrate={() => undefined}
        defaultValues={{ name: 'Fresh', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )

    await waitFor(() => expect(nameInput()).toHaveValue('Fresh'))
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('persistMigrate discarded the draft'),
    )
    expect(storage.dump().draft).toBeUndefined()
    warn.mockRestore()
  })

  it('warns instead of swallowing corrupt data', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const storage = makeStorage({ draft: '{not json' })

    render(
      <AutoForm
        form={form}
        persistKey='draft'
        persistStorage={storage}
        defaultValues={{ name: 'Fresh', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('unreadable'),
        expect.anything(),
      ),
    )
    expect(nameInput()).toHaveValue('Fresh')
    warn.mockRestore()
  })

  it('restores from an async storage adapter', async () => {
    const inner = makeStorage({
      draft: JSON.stringify({ __uniformVersion: 0, values: { name: 'Async' } }),
    })
    const asyncStorage: PersistStorage = {
      getItem: (k) => Promise.resolve(inner.getItem(k) as string | null),
      setItem: (k, v) => Promise.resolve(inner.setItem(k, v) as void),
      removeItem: (k) => Promise.resolve(inner.removeItem(k) as void),
    }

    render(
      <AutoForm
        form={form}
        persistKey='draft'
        persistStorage={asyncStorage}
        layout={{ loadingFallback: <p>restoring…</p> }}
        defaultValues={{ name: '', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByText('restoring…')).toBeInTheDocument()
    await waitFor(() => expect(nameInput()).toHaveValue('Async'))
  })

  it('reads a legacy unversioned draft as version 0', async () => {
    const storage = makeStorage({ draft: JSON.stringify({ name: 'Legacy' }) })
    render(
      <AutoForm
        form={form}
        persistKey='draft'
        persistStorage={storage}
        defaultValues={{ name: '', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )
    await waitFor(() => expect(nameInput()).toHaveValue('Legacy'))
  })

  it('exposes clearPersistedData and hasPersistedDraft on form methods', async () => {
    const storage = makeStorage({
      draft: JSON.stringify({ __uniformVersion: 0, values: { name: 'Draft' } }),
    })

    function App() {
      const uniform = useUniForm(form, {
        persistKey: 'draft',
        persistStorage: storage,
        defaultValues: { name: '', nickname: '' },
      })
      if (uniform.isLoading) return <p>loading</p>
      return (
        <UniFormProvider form={uniform}>
          <span data-testid='has-draft'>
            {String(uniform.methods.hasPersistedDraft())}
          </span>
          <button
            type='button'
            onClick={() => uniform.methods.clearPersistedData()}
          >
            clear
          </button>
        </UniFormProvider>
      )
    }

    const { user } = setup(<App />)
    await waitFor(() =>
      expect(screen.getByTestId('has-draft')).toHaveTextContent('true'),
    )
    await user.click(screen.getByRole('button', { name: 'clear' }))
    expect(storage.dump().draft).toBeUndefined()
  })

  it('writes a versioned envelope', async () => {
    const storage = makeStorage()
    const { user } = setup(
      <AutoForm
        form={form}
        persistKey='draft'
        persistStorage={storage}
        persistDebounce={0}
        persistVersion={3}
        defaultValues={{ name: '', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(nameInput(), 'Ada')

    await waitFor(() => expect(storage.dump().draft).toBeDefined())
    const stored = JSON.parse(storage.dump().draft) as {
      __uniformVersion: number
      values: Record<string, unknown>
    }
    expect(stored.__uniformVersion).toBe(3)
    expect(stored.values.name).toBe('Ada')
  })

  it('defaults to sessionStorage, not localStorage', async () => {
    const sessionSpy = vi.spyOn(Storage.prototype, 'setItem')
    const { user } = setup(
      <AutoForm
        form={form}
        persistKey='default-store'
        persistDebounce={0}
        defaultValues={{ name: '', nickname: '' }}
        onSubmit={vi.fn()}
      />,
    )
    await user.type(nameInput(), 'A')
    await waitFor(() =>
      expect(sessionStorage.getItem('default-store')).not.toBeNull(),
    )
    expect(localStorage.getItem('default-store')).toBeNull()
    sessionSpy.mockRestore()
    sessionStorage.clear()
  })
})

// Keeps the FieldProps import meaningful for custom-component typing above.
export type _Unused = FieldProps

import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform/core'
import { SubmittedData } from './shared'

const productSchema = z.object({
  category: z.enum(['electronics', 'clothing', 'books']),
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().optional(),
  stock: z.number().optional(),
})

type ProductValues = z.infer<typeof productSchema>

/** Simulates fetching product info from an API */
async function fetchProductInfo(
  productId: string,
  category: string,
): Promise<{ name: string; stock: number } | null> {
  await new Promise((r) => setTimeout(r, 800))
  // Fake catalog
  const catalog: Record<string, { name: string; stock: number }> = {
    'E-001': { name: 'Wireless Headphones', stock: 42 },
    'E-002': { name: 'USB-C Hub', stock: 8 },
    'C-001': { name: 'Merino Wool Sweater', stock: 15 },
    'B-001': { name: 'TypeScript Deep Dive', stock: 200 },
  }
  const prefix = category[0].toUpperCase()
  return catalog[`${prefix}-${productId.padStart(3, '0')}`] ?? null
}

const productForm = createForm(productSchema)
  .setOnChange('productId', async (value, ctx) => {
    const category = ctx.getValues().category
    if (!value || !category) return

    // Show loading state on the derived fields while we fetch
    ctx.setFieldMeta('productName', { disabled: true, placeholder: 'Loading…' })
    ctx.setFieldMeta('stock', { disabled: true })

    const info = await fetchProductInfo(String(value), category)

    if (info) {
      ctx.setValue('productName', info.name)
      ctx.setValue('stock', info.stock)
      ctx.setFieldMeta('productName', { disabled: false, placeholder: '' })
      ctx.setFieldMeta('stock', { disabled: false })
    } else {
      ctx.setValue('productName', undefined)
      ctx.setValue('stock', undefined)
      ctx.setFieldMeta('productName', {
        disabled: false,
        placeholder: 'Not found',
      })
      ctx.setFieldMeta('stock', { disabled: false })
    }
  })
  .setOnChange('category', (_, ctx) => {
    // Reset derived fields when category changes
    ctx.setValue('productId', '')
    ctx.setValue('productName', undefined)
    ctx.setValue('stock', undefined)
  })

export default function Example20() {
  const [data, setData] = useState<ProductValues | null>(null)

  return (
    <section id='ex20'>
      <h2>Example 20: Async setOnChange</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>setOnChange</code> handlers can now be <code>async</code>. Here,
        typing a Product ID triggers a simulated API lookup (~800 ms). While
        waiting, the derived fields are disabled with a "Loading…" placeholder.
        Try IDs like <strong>001</strong> or <strong>002</strong> with{' '}
        <em>Electronics</em>, or <strong>001</strong> with <em>Books</em>.
      </p>
      <AutoForm
        form={productForm}
        defaultValues={{ category: 'electronics' }}
        fields={{
          category: { label: 'Category' },
          productId: {
            label: 'Product ID',
            placeholder: 'e.g. 001, 002…',
            description: 'Enter an ID to auto-fill name and stock',
          },
          productName: { label: 'Product Name (auto-filled)', disabled: true },
          stock: { label: 'Stock (auto-filled)', disabled: true },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}

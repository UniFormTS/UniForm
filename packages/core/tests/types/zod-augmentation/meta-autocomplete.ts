/// <reference types="@uniform-ts/core/zod-augmentation" />

// Proves the Zod `.meta()` augmentation works from the types-only subpath
// alone: there is no runtime import of @uniform-ts/core anywhere in this file.
import * as z from 'zod/v4'

export const schema = z.object({
  email: z
    .string()
    .meta({ label: 'Work email', placeholder: 'you@example.com', span: 6 }),
  role: z.enum(['admin', 'user']).meta({ section: 'Access', order: 1 }),
})

// @ts-expect-error — `notAMetaKey` is not part of FieldMetaBase
z.string().meta({ label: 'ok', span: 'wide' })

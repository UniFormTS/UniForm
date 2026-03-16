import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'installation',
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/auto-form',
        'api/create-form',
        'api/create-auto-form',
        'api/types',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/custom-components',
        'guides/field-overrides',
        'guides/layout',
        'guides/sections',
        'guides/conditional-fields',
        'guides/arrays',
        'guides/validation',
        'guides/persistence',
        'guides/programmatic-control',
        'guides/discriminated-unions',
        'guides/async',
      ],
    },
  ],
}

export default sidebars

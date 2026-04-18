import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    'tutorial',
    'installation',
    'concepts',
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/auto-form',
        'api/create-form',
        'api/create-auto-form',
        'api/use-array-field',
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
        'guides/localization',
        'guides/validation',
        'guides/persistence',
        'guides/programmatic-control',
        'guides/plain-unions',
        'guides/discriminated-unions',
        'guides/async',
      ],
    },
  ],
}

export default sidebars

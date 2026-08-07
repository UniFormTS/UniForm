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
        'api/use-auto-form-context',
        'api/use-uniform',
        'api/uniform-provider',
        'api/use-form-value',
        'api/field',
        'api/use-field',
        'api/use-field-error',
        'api/types',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/custom-components',
        'guides/headless',
        'guides/field-overrides',
        'guides/layout',
        'guides/sections',
        'guides/conditional-fields',
        'guides/dynamic-requiredness',
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

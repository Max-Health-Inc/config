const PLUGIN = 'jsx-a11y-x'

/** shared-ui primitives that render one native element, so every rule can see through them. */
const SHARED_UI_ELEMENTS = {
  Label: 'label',
  Input: 'input',
  Textarea: 'textarea',
  NativeSelect: 'select',
  Button: 'button',
}

/** Radix-based shared-ui controls render a button carrying the id, so a label can target them. */
const SHARED_UI_CONTROLS = ['Select', 'SelectTrigger', 'Checkbox', 'Switch', 'RadioGroupItem', 'Slider']

/**
 * Accessibility block for createReactConfig, built from eslint-plugin-jsx-a11y-x (the
 * eslint-community fork that supports ESLint 10; the original stops at 9).
 *
 * @param {{ configs?: { recommended?: { plugins: object, rules: object } } }} plugin
 */
export function a11yConfig(plugin) {
  const recommended = plugin?.configs?.recommended
  if (!recommended?.plugins?.[PLUGIN]) {
    throw new TypeError('createReactConfig({ a11y }) expects the eslint-plugin-jsx-a11y-x module')
  }
  return {
    plugins: { [PLUGIN]: recommended.plugins[PLUGIN] },
    settings: { [PLUGIN]: { components: SHARED_UI_ELEMENTS } },
    rules: {
      ...recommended.rules,
      [`${PLUGIN}/label-has-associated-control`]: ['error', {
        controlComponents: SHARED_UI_CONTROLS,
        assert: 'either',
        depth: 3,
      }],
      [`${PLUGIN}/no-noninteractive-tabindex`]: ['error', {
        tags: [],
        roles: ['tabpanel', 'region'],
        allowExpressionValues: true,
      }],
    },
  }
}

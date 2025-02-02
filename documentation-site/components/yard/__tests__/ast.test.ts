import {
  transformBeforeCompilation,
  parse,
  parseOverrides,
  toggleOverrideSharedProps,
  parseCode,
} from '../ast';
import {formatAstAndPrint} from '../code-generator';
import {PropTypes} from '../const';

describe('transformBeforeCompilation', () => {
  test('remove imports', () => {
    const source = `
      import { Input } from "baseui/input";
      import { foo } from "baz";
      () => <Input value="Hello" />;
    `;
    expect(
      formatAstAndPrint(transformBeforeCompilation(parse(source), '', {})),
    ).toBe('() => <Input value="Hello" />');
  });

  test('remove exports', () => {
    const source = `
      export default () => <Input value="Hello" />;
    `;
    expect(
      formatAstAndPrint(transformBeforeCompilation(parse(source), '', {})),
    ).toBe('() => <Input value="Hello" />');
  });

  test('instrument a callback with __yard_onChange', () => {
    const source = '<Input onChange={e => foo()} />';
    expect(
      formatAstAndPrint(
        transformBeforeCompilation(parse(source), 'Input', {
          onChange: {
            value: '',
            type: PropTypes.Function,
            description: '',
            meta: {
              propHook: {
                what: 'e.target.value',
                into: 'value',
              },
            },
          },
        }),
      ),
    ).toBe(`<Input
  onChange={e => {
    foo();
    __yard_onChange("Input", "value", e.target.value);
  }}
/>`);
  });

  test('instrument a callback with __yard_onChange (callback return a BlockStatement)', () => {
    const source = '<Input onChange={e => { foo(); baz(); }} />';
    expect(
      formatAstAndPrint(
        transformBeforeCompilation(parse(source), 'Input', {
          onChange: {
            value: '',
            type: PropTypes.Function,
            description: '',
            meta: {
              propHook: {
                what: 'e.target.value',
                into: 'value',
              },
            },
          },
        }),
      ),
    ).toBe(`<Input
  onChange={e => {
    foo();
    baz();
    __yard_onChange("Input", "value", e.target.value)
  }}
/>`);
  });
});

describe('parseOverrides', () => {
  test('get overrides active state and value', () => {
    const overrides = `{
    Root: {
      style: ({ $theme }) => {
        return {
          outline: \`\${$theme.colors.warning200} solid\`,
          backgroundColor: $theme.colors.warning200
        };
      }
    }
  }`;
    expect(parseOverrides(overrides, ['Root'])).toEqual({
      Root: {
        active: true,
        style: `({ $theme }) => {
  return {
    outline: \`\${\$theme.colors.warning200} solid\`,
    backgroundColor: $theme.colors.warning200
  };
}`,
      },
    });
  });
});

describe('toggleOverrideSharedProps', () => {
  test('adding them', () => {
    const overrides = `{
    Root: {
      style: ({ $theme }) => {
        return {
          outline: \`\${$theme.colors.warning200} solid\`,
          backgroundColor: $theme.colors.warning200
        };
      }
    }
  }`;
    expect(toggleOverrideSharedProps(overrides, ['$isActive'])).toEqual(`({
  $theme,
  $isActive
}) => {
  return {
    outline: \`\${$theme.colors.warning200} solid\`,
    backgroundColor: $theme.colors.warning200
  };
}`);
  });

  test('removing them', () => {
    const overrides = `{
    Root: {
      style: ({ $theme, $isActive }) => {
        return {
          outline: \`\${$theme.colors.warning200} solid\`,
          backgroundColor: $theme.colors.warning200
        };
      }
    }
  }`;
    expect(toggleOverrideSharedProps(overrides, ['$isActive'])).toEqual(`({
  $theme
}) => {
  return {
    outline: \`\${$theme.colors.warning200} solid\`,
    backgroundColor: $theme.colors.warning200
  };
}`);
  });
});

describe('parseCode', () => {
  test('extract props and theme', () => {
    const fixture = `
      import { Input } from "baseui/input";
      import {
        ThemeProvider,
        createTheme,
        lightThemePrimitives
      } from "baseui";

      export default () => {
        const [value, setValue] = React.useState("Hello");
        return (
          <ThemeProvider
            theme={createTheme(lightThemePrimitives, {
              colors: { inputFill: "yellow" }
            })}
          >
            <Input
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="Controlled Input"
              overrides={{
                Root: {
                  style: ({ $theme }) => {
                    return {
                      outline: \`\${$theme.colors.warning200} solid\`,
                      backgroundColor: $theme.colors.warning200
                    };
                  }
                }
              }}
            />
          </ThemeProvider>
        );
      }
    `;
    expect(parseCode(fixture, 'Input')).toEqual({
      parsedProps: {
        children: '',
        onChange: 'e => setValue(e.target.value)',
        overrides: `({
  Root: {
    style: ({ $theme }) => {
      return {
        outline: \`\${$theme.colors.warning200} solid\`,
        backgroundColor: $theme.colors.warning200
      };
    }
  }
})`,
        placeholder: 'Controlled Input',
        value: 'Hello',
      },
      parsedTheme: {
        inputFill: 'yellow',
      },
    });
  });
});

module.exports = {
  extends: ["airbnb", "prettier", "prettier/react"],
  parser: "babel-eslint",
  parserOptions: {
    ecmaVersion: 2017,
    ecmaFeatures: {
      jsx: true
    },
    sourceType: "module",
    allowImportExportEverywhere: false,
    codeFrame: true
  },
  plugins: ["prettier", "react"],
  rules: {
    "react/jsx-filename-extension": [
      1,
      {
        extensions: [".js", ".jsx"]
      }
    ],
    "react/prop-types": 0,
    "no-underscore-dangle": 0,
    "import/imports-first": ["error", "absolute-first"],
    "import/newline-after-import": "error",
    "jsx-a11y/anchor-is-valid": ["off"],
    "react/jsx-props-no-spreading": ["off"],
    "import/no-named-as-default": ["off"],
    "react/static-property-placement": ["off"],
    "react/forbid-prop-types": ["off"],
    "global-require": ["off"],
    "jsx-a11y/label-has-associated-control": [
      "error",
      {
        required: {
          some: ["nesting", "id"]
        }
      }
    ],
    "jsx-a11y/label-has-for": [
      "error",
      {
        required: {
          some: ["nesting", "id"]
        }
      }
    ]
  },
  globals: {
    window: true,
    document: true,
    localStorage: true,
    FormData: true,
    FileReader: true,
    Blob: true,
    "window.document": false,
    navigator: true
  },
  overrides: [
    {
      files: [
        "**/*.test.js",
        "tests/acceptance/**/*.js",
        "playwright.config.js"
      ],
      env: {
        jest: true
      },
      rules: {
        "import/no-extraneous-dependencies": [
          "error",
          { devDependencies: true }
        ]
      }
    }
  ]
};

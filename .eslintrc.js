module.exports = {
  "env": {
    "browser": true,
    "commonjs": true,
    "es6": true,
  },
  "globals": {
    // Allowed globals
    "console": true,
    //"MediaSource": true,
    "performance": true,
    "crypto": true,
    "fetch": true,
    "Request": true,
    "Headers": true,
    "escape": true,

    // Compile-time defines
    "__VERSION__": true,
    "__USE_SUBTITLES__": true,
    "__USE_ALT_AUDIO__": true,
    "__USE_EME_DRM__": true
  },
  // see https://standardjs.com/
  // see https://github.com/standard/eslint-config-standard
  // see https://github.com/felixge/node-style-guide
  "extends": [
    "eslint:recommended",
    //"node-style-guide"
  ],
  "parserOptions": {
    "sourceType": "module"
  },
  "rules": {
    // our basic style rules
    "semi": ["error", "always"],
    "indent": [
      "error",
      2
    ],
    "quotes": [
      "error",
      "single"
    ],
    "linebreak-style": [
      "error",
      "unix"
    ],

    // part of Node Style-guide but ignored
    // (commented until we enable node-style-guide)
    /*
    "max-len": 0,
    "max-statements": 0,
    "space-after-keywords": 0,
    */

    // loosening of code-quality rules we may want to fix later (warnings for now)
    "no-unused-vars": 1,
    "no-console": 1,
    "no-fallthrough": 1,
    "no-case-declarations": 1,
    "no-irregular-whitespace": 1,
    "no-self-assign": 1

  }
};

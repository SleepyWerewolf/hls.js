module.exports = {
  "env": {
    "browser": true,
    "commonjs": true,
    "es6": true,
  },
  "globals": {
    // Allowed globals
    "console": true,
    "MediaSource": true,
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
    "node-style-guide"
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
    "max-len": 0,
    "max-statements": 0,
    "space-after-keywords": 0

  }
};

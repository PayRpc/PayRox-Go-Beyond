/* eslint-env node */
/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    // Import resolution for CSS files
    'postcss-import': {},

    // Nested CSS support (like Sass)
    'postcss-nested': {},

    // Custom properties (CSS variables) support with fallbacks
    'postcss-custom-properties': {
      preserve: true, // Keep custom properties for modern browsers
    },

    // Autoprefixer for vendor prefixes
    autoprefixer: {
      // Browser support based on browserslist in package.json
      cascade: false, // Don't cascade prefixes for cleaner output
    },

    // CSS Nano for production minification (Vite will handle this automatically)
    // Uncomment for manual control:
    // cssnano: {
    //   preset: [
    //     'default',
    //     {
    //       // Preserve important comments
    //       discardComments: {
    //         removeAll: false,
    //       },
    //       // Don't merge rules to maintain specificity
    //       mergeRules: false,
    //       // Preserve custom properties
    //       reduceIdents: false,
    //     },
    //   ],
    // },
  },
};

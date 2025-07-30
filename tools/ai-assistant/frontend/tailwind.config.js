/** @type {import('tailwindcss').Config} */
export default {
  // Disable Tailwind since we're using custom CSS design system
  content: [],
  
  // Minimal configuration to prevent conflicts
  corePlugins: {
    preflight: false, // Don't reset styles - we have our own reset
  },
  
  // Empty theme to avoid conflicts with our CSS custom properties
  theme: {},
  
  // No plugins needed
  plugins: [],
}
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // FIX: The colors object is now correctly placed inside 'extend'
      colors: {
        'brand-dark': '#1a202c',
        'brand-light': '#f7fafc',
        'brand-primary': '#4299e1',
        'brand-accent': '#f56565',
        'brand-bg': '#f0f9ff',
      },
      fontFamily: {
        sans: ['var(--font-body)'],
        heading: ['var(--font-heading)'],
      },
      // FIX: The backgroundImage object is now correctly preserved alongside colors
      backgroundImage: {
        'mosaic-pattern': "url('/patterns/mosaic.svg')",
      },
    },
  },
  plugins: [],
};
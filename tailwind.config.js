/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,scss}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f4fbde',
          100: '#e6f7ba',
          200: '#cef07e',
          300: '#b3e349',
          400: '#8dcb2c',
          500: '#8dcb2c',
          600: '#72a322',
          700: '#567a18',
          800: '#3c5311',
          900: '#22300a',
        },
      },
    },
  },
  plugins: [],
};

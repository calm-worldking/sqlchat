/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3498db',
        'primary-dark': '#2980b9',
        secondary: '#2ecc71',
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
  ],
} 
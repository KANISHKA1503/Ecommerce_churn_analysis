/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0B132B',
          800: '#1C2541',
          700: '#3A506B',
        },
        brand: {
          teal: '#06B6D4',
          cyan: '#0891B2',
          blue: '#2563EB',
          accent: '#14B8A6',
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          sidebar: '#0e172a',
          sidebarActive: '#1d4ed8',
          bg: '#f8fafc',
          primary: '#2563eb',
          secondary: '#475569'
        }
      }
    },
  },
  plugins: [],
}

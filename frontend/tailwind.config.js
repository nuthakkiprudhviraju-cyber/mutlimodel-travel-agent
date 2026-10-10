/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F4F4F4',
        roam: {
          dark: '#121C1A',
          forest: '#2D4645',
          muted: '#A3ACA9',
          text: '#5C6460',
          accent: '#466C9D',
          surface: '#FFFFFF',
          border: '#E2E5E4'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}

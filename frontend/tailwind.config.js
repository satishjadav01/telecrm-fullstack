/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        tele: {
          primary: '#516935',
          secondary: '#467653',
          light: '#d3ecaa',
          dark: '#382819',
          muted: '#9ec7b1',
          bg: '#fcfcfc',
          card: '#ffffff',
          border: '#e8ecef',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(56, 40, 25, 0.04)',
        'medium': '0 8px 24px rgba(56, 40, 25, 0.08)',
      },
      borderRadius: {
        'btn': '8px',
        'input': '8px',
        'card': '12px',
        'modal': '16px',
        'table': '10px',
      }
    },
  },
  plugins: [],
}

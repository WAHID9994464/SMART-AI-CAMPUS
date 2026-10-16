/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Camel family
        camel: {
          50:  '#fdf8f0',
          100: '#f7edda',
          200: '#edd8b0',
          300: '#e0be82',
          400: '#d4a054',
          500: '#c8883a',
          600: '#b0722e',
          700: '#8f5a25',
          800: '#704621',
          900: '#5a3820',
        },
        // Black Earth family
        earth: {
          50:  '#f5f3f0',
          100: '#e8e3dc',
          200: '#d0c8bc',
          300: '#b5a896',
          400: '#9a8978',
          500: '#7d6e60',
          600: '#5f5248',
          700: '#403830',
          800: '#26201a',
          900: '#140e0a',
          950: '#0a0704',
        },
        // Robin Hood / Forest Green family  
        robin: {
          50:  '#f0f9f0',
          100: '#dcf0dc',
          200: '#b8e2b8',
          300: '#88cc88',
          400: '#5ab25a',
          500: '#3d9440',
          600: '#2e7a30',
          700: '#246028',
          800: '#1c4c20',
          900: '#163d1a',
          950: '#0c2410',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

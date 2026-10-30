/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#030712',
          900: '#060B1E',
          850: '#0B132B',
          800: '#1C2541',
          700: '#3A506B',
        },
        cyber: {
          cyan: '#00F0FF',
          purple: '#9D4EDD',
          emerald: '#10B981',
          rose: '#F43F5E',
          amber: '#F59E0B',
          blue: '#3B82F6',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)' },
          '100%': { boxShadow: '0 0 25px rgba(0, 240, 255, 0.7)' },
        }
      }
    },
  },
  plugins: [],
}


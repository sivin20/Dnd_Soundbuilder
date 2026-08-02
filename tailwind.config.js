/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        parchment: '#f5e6c8',
        'parchment-dark': '#e8d5a3',
      },
      // Stacks live in :root in index.css so the CSS can reference them too.
      fontFamily: {
        sans: ['var(--font-ui)'],
        serif: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #d97706, 0 0 10px #d97706' },
          '100%': { boxShadow: '0 0 10px #f59e0b, 0 0 25px #f59e0b' },
        },
      },
    },
  },
  plugins: [],
}


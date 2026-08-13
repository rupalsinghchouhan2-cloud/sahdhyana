/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // The sanctuary palette — warm, light, organic
        ivory: '#f7f3ea',
        cream: '#fbf8f1',
        sand: '#ece2cf',
        'sand-deep': '#ddd0b8',
        sage: {
          50: '#f3f6f1',
          100: '#e4ebdf',
          200: '#c9d7c0',
          300: '#a5bc98',
          400: '#7fa06f',
          500: '#5f8352',
          600: '#4a683f',
          700: '#3b5333',
          800: '#31432b',
          900: '#283725',
        },
        lotus: {
          50: '#fbf3f4',
          100: '#f6e5e8',
          200: '#eecdd4',
          300: '#e2a8b6',
          400: '#d17f95',
          500: '#be5e79',
        },
        powder: {
          50: '#f2f7f9',
          100: '#e4eff3',
          200: '#c5dfe8',
          300: '#99c5d5',
          400: '#67a4bb',
          500: '#48809a',
        },
        gold: {
          100: '#f6ecd4',
          200: '#eedaa8',
          300: '#e3c475',
          400: '#d6ab4e',
          500: '#c4942f',
        },
        ink: {
          DEFAULT: '#3d362c',
          soft: '#5c5344',
          faint: '#8a7f6c',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Nunito Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        blob: '2.5rem',
      },
      boxShadow: {
        soft: '0 2px 20px -4px rgba(61, 54, 44, 0.08), 0 1px 4px rgba(61, 54, 44, 0.04)',
        lift: '0 8px 32px -8px rgba(61, 54, 44, 0.14), 0 2px 8px rgba(61, 54, 44, 0.05)',
        inner: 'inset 0 1px 3px rgba(61, 54, 44, 0.06)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.7' },
          '50%': { transform: 'scale(1.12)', opacity: '1' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        drift: {
          '0%': { transform: 'translateX(-4%) translateY(0)' },
          '50%': { transform: 'translateX(4%) translateY(-6px)' },
          '100%': { transform: 'translateX(-4%) translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.9)', opacity: '0.6' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
      },
      animation: {
        breathe: 'breathe 8s ease-in-out infinite',
        'breathe-slow': 'breathe 12s ease-in-out infinite',
        floaty: 'floaty 7s ease-in-out infinite',
        drift: 'drift 18s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        ripple: 'ripple 3s ease-out infinite',
      },
    },
  },
  plugins: [],
};

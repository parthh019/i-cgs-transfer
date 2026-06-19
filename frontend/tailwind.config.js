/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    borderRadius: {
      none: '0px',
      sm: '4px',
      DEFAULT: '4px',
      md: '4px',
      lg: '4px',
      xl: '4px',
      '2xl': '4px',
      '3xl': '4px',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        brand: ['"Orbitron"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          50: 'var(--primary-soft)',
          100: 'var(--primary-soft)',
          200: 'var(--primary-soft)',
          300: 'var(--primary-soft)',
          400: 'var(--primary)',
          500: 'var(--primary)',
          600: 'var(--primary)',
          700: 'var(--primary)',
          800: 'var(--primary)',
          900: 'var(--primary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          50: 'var(--accent-soft)',
          100: 'var(--accent-soft)',
          500: 'var(--accent)',
          600: 'var(--accent)',
          700: 'var(--accent)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}


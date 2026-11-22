/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand navy (#083A4F — primary brand colour, 18:1 on white)
        brand: {
          DEFAULT: '#083A4F',
          hover:   '#052C3D',
          light:   '#D6E8F0',
          subtle:  'rgba(8, 58, 79, 0.08)',
        },
        // Brand teal
        teal: {
          50:  '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        // Deep navy — dark theme backgrounds
        navy: {
          950: '#060E1B',
          900: '#0B1220',
          800: '#111C2E',
          700: '#172337',
          600: '#1E2D45',
          500: '#253650',
          400: '#2F4163',
          300: '#3D5278',
          200: '#52688F',
          100: '#7A90B0',
        },
        // Semantic surface tokens (resolved by CSS vars, defined here for Tailwind IDE support)
        surface: {
          base:    'var(--bg-base)',
          primary: 'var(--bg-surface)',
          raised:  'var(--bg-raised)',
          sunken:  'var(--bg-sunken)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      boxShadow: {
        'card':      '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        'card-md':   '0 4px 12px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06)',
        'card-lg':   '0 10px 30px rgba(0,0,0,0.12), 0 4px 10px rgba(0,0,0,0.06)',
        'modal':     '0 20px 60px rgba(0,0,0,0.3), 0 8px 20px rgba(0,0,0,0.2)',
        'inset-top': 'inset 0 1px 0 rgba(255,255,255,0.05)',
      },
      borderRadius: {
        DEFAULT: '6px',
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
      },
      spacing: {
        '4.5': '1.125rem',
        '13':  '3.25rem',
        '15':  '3.75rem',
        '18':  '4.5rem',
      },
      transitionDuration: {
        '150': '150ms',
      },
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'slide-up': 'slideUp 200ms ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};

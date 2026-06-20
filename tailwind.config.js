/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: 'var(--coral)',
          dark: 'var(--coral-dark)',
          light: 'rgba(232, 97, 77, 0.1)',
        },
        teal: {
          DEFAULT: 'var(--teal)',
          dark: '#1AAF8B',
          light: 'rgba(45, 212, 168, 0.1)',
        },
        app: {
          DEFAULT: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
          card: 'var(--surface-card)',
          raised: 'var(--surface-raised)',
          reasoning: 'var(--surface-reasoning)',
        },
        fg: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        line: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
        },
        err: 'var(--error)',
        agent: {
          bubble: 'var(--agent-bubble-bg)',
        },
        tag: {
          teal: 'var(--tag-teal-text)',
          'teal-bg': 'var(--tag-teal-bg)',
          error: 'var(--tag-error-text)',
          'error-bg': 'var(--tag-error-bg)',
        },
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};

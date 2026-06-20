/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#E8614D',
          dark: '#C44A38',
          light: 'rgba(232, 97, 77, 0.1)',
        },
        teal: {
          DEFAULT: '#2DD4A8',
          dark: '#1AAF8B',
          light: 'rgba(45, 212, 168, 0.1)',
        },
        surface: {
          bg: '#0F0F13',
          card: '#1A1A23',
          raised: '#24243A',
          border: '#2A2A3C',
        },
        txt: {
          primary: '#ECECF1',
          secondary: '#8B8B9E',
          tertiary: '#4A4A5C',
        },
        error: '#F87171',
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

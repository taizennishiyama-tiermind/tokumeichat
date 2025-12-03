import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'corp-blue': '#00529B',
        'corp-blue-light': '#007BFF',
        'corp-gray': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
      },
      animation: {
        'fly-up': 'fly-up 1s ease-out forwards',
      },
      keyframes: {
        'fly-up': {
          '0%': { transform: 'translateX(-50%) translateY(0)', opacity: '1' },
          '100%': { transform: 'translateX(-50%) translateY(-60px)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}

export default config

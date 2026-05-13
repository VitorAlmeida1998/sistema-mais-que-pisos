/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#DC2626',
          dark: '#991B1B',
          light: '#FEE2E2',
        },
        success: '#10B981',
        warning: '#F59E0B',
        text: '#1F2937',
      },
      borderRadius: {
        sm: '0.375rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.25rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      boxShadow: {
        'card': '0 4px 24px 0 rgba(0,0,0,0.06)',
        'card-hover': '0 8px 32px 0 rgba(0,0,0,0.10)',
        'primary': '0 4px 14px 0 rgba(220,38,38,0.35)',
        'primary-hover': '0 6px 20px 0 rgba(220,38,38,0.45)',
      },
      backgroundImage: {
        'sidebar': 'linear-gradient(180deg, #0F172A 0%, #111827 100%)',
      },
    },
  },
  plugins: [],
}

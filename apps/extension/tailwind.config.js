/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'sv-navy':   '#0F2444',
        'sv-blue':   '#1A6FBF',
        'sv-ai':     '#DC2626',
        'sv-human':  '#16A34A',
        'sv-likely': '#D97706',
        'sv-unknown':'#94A3B8',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

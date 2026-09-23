/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Warm neutral canvas + near-black ink, with a single "volt" accent
        paper: '#F5F4EF',
        ink: {
          DEFAULT: '#0F1411',
          50: '#F4F5F4',
          100: '#E6E8E6',
          200: '#CDD2CE',
          300: '#A7AFA9',
          400: '#7A847D',
          500: '#5A645D',
          600: '#434C46',
          700: '#2F3632',
          800: '#1C221E',
          900: '#0F1411',
        },
        volt: {
          DEFAULT: '#D6FF3D',
          soft: '#EEFFB3',
          deep: '#A8D40F',
        },
        // Relative price scale
        cheap: { DEFAULT: '#12A150', soft: '#E3F6EA', ink: '#0B6B35' },
        fair: { DEFAULT: '#E09B12', soft: '#FDF3DC', ink: '#8A5A00' },
        pricey: { DEFAULT: '#E5484D', soft: '#FDE8E8', ink: '#A1262B' },
        // Pump-handle colours used in Spain
        fuel: {
          g95: '#16A34A',
          diesel: '#111827',
          g98: '#166534',
          glp: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,20,17,0.04), 0 4px 16px -4px rgba(15,20,17,0.08)',
        lift: '0 2px 4px rgba(15,20,17,0.05), 0 16px 40px -12px rgba(15,20,17,0.22)',
        glow: '0 0 0 4px rgba(214,255,61,0.35)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(6px)' }, '100%': { opacity: 1, transform: 'none' } },
      },
      animation: {
        rise: 'rise .35s ease-out both',
      },
    },
  },
  plugins: [],
};

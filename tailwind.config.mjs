/** @type {import('tailwindcss').Config} */
// Sistema visual «Carretera»: asfalto, azul de autovía, amarillo de señal y
// el monolito de precios de las gasolineras españolas.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Lienzo gris hormigón, frío y luminoso
        paper: '#ECEFF3',
        // Asfalto: neutros fríos con un leve sesgo azul
        ink: {
          DEFAULT: '#14181F',
          50: '#F3F5F8',
          100: '#E3E7ED',
          200: '#CAD1DB',
          300: '#A3ADBB',
          400: '#66717F',
          500: '#566170',
          600: '#414A57',
          700: '#2C333D',
          800: '#1C2129',
          900: '#14181F',
        },
        // Azul de autovía (señalización española)
        road: {
          DEFAULT: '#1B4FA8',
          deep: '#123A80',
          night: '#0C2657',
          soft: '#E2EBFA',
          line: '#9FB8E6',
        },
        // Amarillo de señal: el único acento cálido. Mantiene el nombre «volt»
        // porque lo usan los scripts de cliente.
        volt: {
          DEFAULT: '#FFC21A',
          soft: '#FFF2C7',
          deep: '#F2A900',
        },
        // Escala relativa de precio
        cheap: { DEFAULT: '#0E9C5B', soft: '#DDF4E8', ink: '#0A6B3F' },
        fair: { DEFAULT: '#E39A0B', soft: '#FDF1D6', ink: '#875600' },
        pricey: { DEFAULT: '#DC3B3F', soft: '#FCE5E5', ink: '#9E2226' },
        // Colores de manguera en España
        fuel: {
          g95: '#0F7F3C',
          diesel: '#14181F',
          g98: '#0D5E2D',
          glp: '#F59E0B',
        },
        led: {
          green: '#5CFF8A',
          amber: '#FFB21A',
          red: '#FF4B3E',
          panel: '#07090C',
        },
      },
      fontFamily: {
        sans: ['"Public Sans Variable"', '"Public Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Overpass Variable"', 'Overpass', '"Public Sans Variable"', 'system-ui', 'sans-serif'],
        led: ['"DSEG7 Classic"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(20,24,31,0.04), 0 1px 2px rgba(20,24,31,0.06), 0 8px 24px -12px rgba(20,24,31,0.14)',
        lift: '0 2px 4px rgba(20,24,31,0.06), 0 24px 48px -16px rgba(20,24,31,0.30)',
        sign: 'inset 0 0 0 2px #fff, inset 0 0 0 3px rgba(255,255,255,0.15), 0 1px 2px rgba(12,38,87,0.25)',
        glow: '0 0 0 4px rgba(255,194,26,0.45)',
        totem: '0 40px 80px -30px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        rise: { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'none' } },
        lanes: { '0%': { backgroundPosition: '0 0' }, '100%': { backgroundPosition: '0 96px' } },
        flicker: {
          '0%': { opacity: 0.15 },
          '8%': { opacity: 1 },
          '12%': { opacity: 0.35 },
          '20%, 100%': { opacity: 1 },
        },
      },
      animation: {
        rise: 'rise .45s cubic-bezier(.2,.7,.2,1) both',
        lanes: 'lanes 2.4s linear infinite',
        flicker: 'flicker 1.1s ease-out both',
      },
    },
  },
  plugins: [],
};

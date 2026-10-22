/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MediFlash Design Tokens (from official clinical design spec)
        brand: {
          50:  '#f0fdf9',
          100: '#e6f2f1', // Primary tint (active)
          200: '#c3e3e0',
          300: '#8cc7c2',
          400: '#3d9e95',
          500: '#14857c',
          600: '#0f766e', // Primary teal
          700: '#0b5f58', // Primary text / links
          800: '#0a4f4a',
          900: '#073b37',
          950: '#042422',
        },
        ink: {
          DEFAULT: '#14201f', // Main body text
          muted:   '#4b5b5a', // Secondary text
        },
        ground: '#f7f9f9',    // Page background
        divider: '#dce4e3',   // Borders and dividing lines
        control: '#6b7c7a',   // Form control edges
      },
      fontFamily: {
        // DD-01: Inter replaces Outfit as primary font
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      // Breakpoint: desktop nav shows at lg (1024px) not xl (1280px) — UX-05 / A-22
      screens: {
        sm:  '640px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [],
}

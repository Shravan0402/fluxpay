// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // --- Custom Base Colors (remap existing names to be more vibrant) ---
        // These will override Tailwind's default shades for these colors

        // Main theme colors, often used in backgrounds and primary elements
        indigo: {
          50: '#eef2ff', // A very light indigo
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1', // Default Indigo-500, often a good primary
          600: '#4f46e5',
          700: '#4338ca', // Deeper Indigo for backgrounds
          800: '#3730a3',
          900: '#312e81', // Very deep, almost navy for dark backgrounds
          950: '#1e1b4b', // Even deeper
        },
        purple: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6', // A vibrant, clear purple
          600: '#7c3aed',
          700: '#6d28d9', // Deeper purple for gradients/accents
          800: '#5b21b6',
          900: '#4c1d95', // Very deep purple
          950: '#2e1065', // Even deeper
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151', // Good for dark text on dark backgrounds or subtle UI
          800: '#1f2937', // Darker gray for panels/cards
          900: '#111827', // Even darker, good for modal overlays
          950: '#030712', // Near black for deepest backgrounds
        },

        // Feedback colors (green/red will be more distinct)
        green: {
          500: '#22C55E', // A bright, clear green for 'correct'
          600: '#16A34A',
        },
        red: {
          500: '#EF4444', // A strong, clear red for 'incorrect'
          600: '#DC2626',
        },
        grey:{
         800:'#696969',
         200: '#778899',
        },
        // Highlight/Accent (yellow for observations, warnings)
        yellow: {
          400: '#FACC15', // Brighter yellow for highlights
          500: '#EAB308',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        'heading': ['Montserrat', 'sans-serif'], // Example: for headings or body text
        'body': ['Merriweather', 'serif'],
        // You'll need to link these fonts in your globals.css or head component
        // Example: font-game-display will then apply the 'Press Start 2P' font
        'game-display': ['"Press Start 2P"', 'cursive'], // Pixel-art style for scores, timers
      },
      // You can extend border colors if needed, but the remapped grays/indigos might suffice
      // For example, border-white would become the new default white you define or default Tailwind white
      // If you want a specific 'white-opacity-10' border, you'd apply that directly with arbitrary values
      // or define a custom utility like 'border-white-10': 'rgba(255, 255, 255, 0.1)'
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'wiggle': 'wiggs 1s ease-in-out infinite',
        'pulse-light': 'pulseLight 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        pulseLight: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        }
      }
    },
  },
  plugins: [],
};

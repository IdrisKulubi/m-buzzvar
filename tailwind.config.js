/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary Gold Color Scheme
        primary: {
          DEFAULT: 'oklch(0.83 0.1 83.77)', // Rich, warm gold
          50: 'oklch(0.97 0.02 83.77)', // Very subtle gold tint
          100: 'oklch(0.95 0.03 83.77)', // Light gold tint
          200: 'oklch(0.92 0.04 83.77)',
          300: 'oklch(0.90 0.05 83.77)', // Medium gold tint
          400: 'oklch(0.87 0.07 83.77)',
          500: 'oklch(0.83 0.1 83.77)', // Main brand color
          600: 'oklch(0.78 0.12 83.77)',
          700: 'oklch(0.72 0.14 83.77)',
          800: 'oklch(0.65 0.16 83.77)',
          900: 'oklch(0.55 0.18 83.77)',
          950: 'oklch(0.45 0.20 83.77)',
        },
        // Core Neutrals
        background: {
          light: 'oklch(1 0 0)', // Pure white
          dark: 'oklch(0.145 0 0)', // Deep black
        },
        foreground: {
          light: 'oklch(0.145 0 0)', // Deep black
          dark: 'oklch(1 0 0)', // Pure white
        },
        // Surface colors with subtle gold tints
        surface: {
          light: 'oklch(0.97 0.02 83.77)', // Very subtle gold tint
          dark: 'oklch(0.18 0.01 83.77)', // Very dark with subtle gold
        },
        // Border colors
        border: {
          light: 'oklch(0.85 0.05 83.77)', // Light gold borders
          dark: 'oklch(0.25 0.03 83.77)', // Dark gold borders
        },
        // Muted text colors
        muted: {
          light: 'oklch(0.65 0.02 83.77)', // Muted gold text
          dark: 'oklch(0.65 0.04 83.77)', // Muted gold text for dark
        },
        // Rainbow Accent Colors
        rainbow: {
          1: 'oklch(66.2% 0.225 25.9)', // Orange-red
          2: 'oklch(60.4% 0.26 302)', // Purple
          3: 'oklch(69.6% 0.165 251)', // Blue
          4: 'oklch(80.2% 0.134 225)', // Light blue
          5: 'oklch(90.7% 0.231 133)', // Green
        },
        // Semantic colors
        success: 'oklch(90.7% 0.231 133)', // Green
        warning: 'oklch(0.75 0.15 65)', // Yellow-orange
        error: 'oklch(66.2% 0.225 25.9)', // Orange-red
        info: 'oklch(69.6% 0.165 251)', // Blue
      },
      fontFamily: {
        'space-mono': ['SpaceMono-Regular'],
      },
      // Add custom shadows for premium look
      boxShadow: {
        'gold-glow': '0 0 20px oklch(0.83 0.1 83.77 / 0.3)',
        'gold-subtle': '0 2px 8px oklch(0.83 0.1 83.77 / 0.1)',
      },
      // Custom gradients
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, oklch(0.83 0.1 83.77), oklch(0.90 0.05 83.77))',
        'dark-gold-gradient': 'linear-gradient(135deg, oklch(0.18 0.01 83.77), oklch(0.145 0 0))',
      },
    },
  },
  plugins: [],
} 
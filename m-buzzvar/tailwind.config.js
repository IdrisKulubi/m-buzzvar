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
        // Primary Gold Color Scheme (converted to hex)
        primary: {
          DEFAULT: '#D4AF37', // Rich, warm gold
          50: '#FAF7E8', // Very subtle gold tint
          100: '#F5E6A3', // Light gold tint
          200: '#F0D574',
          300: '#E6C547', // Medium gold tint
          400: '#DDB82C',
          500: '#D4AF37', // Main brand color
          600: '#B8941F',
          700: '#9C7A1A',
          800: '#806014',
          900: '#64460F',
          950: '#4A330B',
        },
        // Core Neutrals
        background: {
          light: '#FFFFFF', // Pure white
          dark: '#0A0A0A', // Deep black
        },
        foreground: {
          light: '#0A0A0A', // Deep black
          dark: '#FFFFFF', // Pure white
        },
        // Surface colors
        surface: {
          light: '#F8F9FA', // Light gray
          dark: '#1A1A1A', // Dark gray
        },
        // Border colors
        border: {
          light: '#E5E7EB', // Light borders
          dark: '#374151', // Dark borders
        },
        // Muted text colors
        muted: {
          light: '#6B7280', // Muted gray text
          dark: '#D1D5DB', // Light gray for dark mode
        },
        // Rainbow Accent Colors
        rainbow: {
          1: '#FF6B35', // Orange-red
          2: '#8B5CF6', // Purple
          3: '#3B82F6', // Blue
          4: '#06B6D4', // Light blue
          5: '#10B981', // Green
        },
        // Semantic colors
        success: '#10B981', // Green
        warning: '#F59E0B', // Yellow-orange
        error: '#FF6B35', // Orange-red
        info: '#3B82F6', // Blue
      },
      fontFamily: {
        'space-mono': ['SpaceMono-Regular'],
      },
      // Add custom shadows for premium look
      boxShadow: {
        'gold-glow': '0 0 20px rgba(212, 175, 55, 0.3)',
        'gold-subtle': '0 2px 8px rgba(212, 175, 55, 0.1)',
      },
      // Custom gradients
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37, #E6C547)',
        'dark-gold-gradient': 'linear-gradient(135deg, #1A1A1A, #0A0A0A)',
      },
    },
  },
  plugins: [],
} 
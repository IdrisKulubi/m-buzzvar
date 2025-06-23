/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Premium Gold Color Scheme for Buzzvar
 * Features a rich gold primary color with deep black/white contrast
 */

// Primary Gold Colors (converted to hex for compatibility)
const primaryGold = '#D4AF37'; // Rich, warm gold
const lightGold = '#F5E6A3'; // Light gold tint
const mutedGold = '#FAF7E8'; // Very subtle gold tint
const accentGold = '#E6C547'; // Medium gold tint
const darkGold = '#B8941F'; // Darker gold for better contrast

// Core Neutrals
const pureWhite = '#FFFFFF'; // Pure white
const deepBlack = '#0A0A0A'; // Deep black
const lightGray = '#F8F9FA'; // Light gray
const darkGray = '#1A1A1A'; // Dark gray
const mediumGray = '#6B7280'; // Medium gray

// Rainbow Accent Colors
const orangeRed = '#FF6B35';
const purple = '#8B5CF6';
const blue = '#3B82F6';
const lightBlue = '#06B6D4';
const green = '#10B981';

export const Colors = {
  light: {
    text: deepBlack,
    background: pureWhite,
    tint: primaryGold,
    icon: darkGold, // Darker gold for better contrast
    tabIconDefault: mediumGray, // Gray for inactive tabs
    tabIconSelected: primaryGold,
    // Additional colors for premium look
    surface: lightGray, // Light background for cards
    border: '#E5E7EB', // Light borders
    muted: mediumGray, // Muted text
    accent: accentGold,
    secondary: lightGold,
    destructive: orangeRed,
  },
  dark: {
    text: pureWhite, // Pure white text for maximum contrast
    background: deepBlack, // Deep black background
    tint: primaryGold, // Gold accent
    icon: primaryGold, // Gold icons for visibility
    tabIconDefault: '#9CA3AF', // Light gray for inactive tabs
    tabIconSelected: primaryGold,
    // Additional colors for premium dark look
    surface: darkGray, // Dark surface with good contrast
    border: '#374151', // Visible dark borders
    muted: '#D1D5DB', // Light gray for muted text - much more visible
    accent: accentGold,
    secondary: '#2D2D2D', // Dark secondary
    destructive: orangeRed,
  },
  // Rainbow accents for special components
  rainbow: {
    color1: orangeRed,
    color2: purple,
    color3: blue,
    color4: lightBlue,
    color5: green,
  },
  // Semantic colors
  semantic: {
    success: green,
    warning: '#F59E0B', // Yellow-orange
    error: orangeRed,
    info: blue,
  },
};

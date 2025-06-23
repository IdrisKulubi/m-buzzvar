/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

/**
 * Premium Gold Color Scheme for Buzzvar
 * Features a rich gold primary color with deep black/white contrast
 */

// Primary Gold Color
const primaryGold = 'oklch(0.83 0.1 83.77)'; // Rich, warm gold
const lightGold = 'oklch(0.95 0.03 83.77)'; // Light gold tint
const mutedGold = 'oklch(0.97 0.02 83.77)'; // Very subtle gold tint
const accentGold = 'oklch(0.90 0.05 83.77)'; // Medium gold tint

// Core Neutrals
const pureWhite = 'oklch(1 0 0)'; // Pure white
const deepBlack = 'oklch(0.145 0 0)'; // Deep black

// Rainbow Accent Colors
const orangeRed = 'oklch(66.2% 0.225 25.9)';
const purple = 'oklch(60.4% 0.26 302)';
const blue = 'oklch(69.6% 0.165 251)';
const lightBlue = 'oklch(80.2% 0.134 225)';
const green = 'oklch(90.7% 0.231 133)';

export const Colors = {
  light: {
    text: deepBlack,
    background: pureWhite,
    tint: primaryGold,
    icon: 'oklch(0.45 0.02 83.77)', // Darker gold for icons
    tabIconDefault: 'oklch(0.55 0.02 83.77)', // Medium gold for inactive tabs
    tabIconSelected: primaryGold,
    // Additional colors for premium look
    surface: mutedGold, // Very subtle gold background for cards
    border: 'oklch(0.85 0.05 83.77)', // Light gold borders
    muted: 'oklch(0.65 0.02 83.77)', // Muted text
    accent: accentGold,
    secondary: lightGold,
    destructive: orangeRed,
  },
  dark: {
    text: pureWhite,
    background: deepBlack,
    tint: primaryGold,
    icon: 'oklch(0.75 0.08 83.77)', // Lighter gold for dark mode icons
    tabIconDefault: 'oklch(0.65 0.06 83.77)', // Medium gold for inactive tabs
    tabIconSelected: primaryGold,
    // Additional colors for premium dark look
    surface: 'oklch(0.18 0.01 83.77)', // Very dark with subtle gold tint
    border: 'oklch(0.25 0.03 83.77)', // Dark gold borders
    muted: 'oklch(0.65 0.04 83.77)', // Muted gold text
    accent: accentGold,
    secondary: 'oklch(0.25 0.02 83.77)', // Dark secondary
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
    warning: 'oklch(0.75 0.15 65)', // Yellow-orange
    error: orangeRed,
    info: blue,
  },
};

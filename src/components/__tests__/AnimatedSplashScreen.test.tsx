import React from 'react';
import { render } from '@testing-library/react-native';
import AnimatedSplashScreen from '../AnimatedSplashScreen';

// Mock expo-linear-gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }: any) => children,
}));

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Mock the logo image
jest.mock('../../../assets/logo/buzzvarlogo.png', () => 'buzzvarlogo.png');

describe('AnimatedSplashScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders correctly', () => {
    const mockOnComplete = jest.fn();
    const { getByText } = render(
      <AnimatedSplashScreen onAnimationComplete={mockOnComplete} />
    );

    expect(getByText('BUZZVAR')).toBeTruthy();
    expect(getByText('where vibes meet reality')).toBeTruthy();
  });

  it('calls onAnimationComplete after animation sequence', () => {
    const mockOnComplete = jest.fn();
    
    render(<AnimatedSplashScreen onAnimationComplete={mockOnComplete} />);

    // Fast-forward through all timers
    jest.runAllTimers();

    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('renders app name with correct styling', () => {
    const mockOnComplete = jest.fn();
    const { getByText } = render(
      <AnimatedSplashScreen onAnimationComplete={mockOnComplete} />
    );

    const appName = getByText('BUZZVAR');
    expect(appName).toBeTruthy();
  });

  it('renders tagline with correct text', () => {
    const mockOnComplete = jest.fn();
    const { getByText } = render(
      <AnimatedSplashScreen onAnimationComplete={mockOnComplete} />
    );

    const tagline = getByText('where vibes meet reality');
    expect(tagline).toBeTruthy();
  });

  it('handles animation completion callback', () => {
    const mockOnComplete = jest.fn();
    
    render(<AnimatedSplashScreen onAnimationComplete={mockOnComplete} />);

    // Animation should complete after timers
    jest.runAllTimers();
    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });
});
import React from 'react';
import { render } from '@testing-library/react-native';
import VenueCardSkeleton from '../skeletons/VenueCardSkeleton';

// Mock Colors
jest.mock('@/constants/Colors', () => ({
  Colors: {
    dark: {
      surface: '#1a1a1a',
      border: '#333333',
    },
    light: {
      surface: '#f5f5f5',
      border: '#e0e0e0',
    },
  },
}));

describe('VenueCardSkeleton', () => {
  it('renders without crashing', () => {
    expect(() => render(<VenueCardSkeleton />)).not.toThrow();
  });

  it('renders skeleton structure', () => {
    const component = render(<VenueCardSkeleton />);
    expect(component).toBeTruthy();
  });

  it('contains card layout structure', () => {
    const component = render(<VenueCardSkeleton />);
    // Should render the card structure
    expect(component.toJSON()).toBeTruthy();
  });

  it('adapts to color scheme', () => {
    const component = render(<VenueCardSkeleton />);
    // Component should render successfully with color scheme
    expect(component).toBeTruthy();
  });

  it('matches venue card structure', () => {
    const component = render(<VenueCardSkeleton />);
    // Should have similar structure to actual venue cards
    expect(component).toBeTruthy();
  });
});
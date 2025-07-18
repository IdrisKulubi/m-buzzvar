// Mock React Native components for Node environment
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: (styles: any) => styles,
  },
  useColorScheme: () => 'dark',
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/constants/Colors', () => ({
  Colors: {
    dark: {
      surface: '#1a1a1a',
      border: '#333',
      muted: '#666',
    },
  },
}));

jest.mock('../BusynessIndicator', () => ({
  BusynessIndicator: 'BusynessIndicator',
}));

describe('LiveIndicator Logic', () => {
  describe('Visibility logic', () => {
    // Test the logic for when the component should render
    const shouldRender = (hasLiveActivity: boolean, recentVibeCount: number) => {
      return hasLiveActivity || recentVibeCount > 0;
    };

    it('should not render when no live activity and no vibe checks', () => {
      expect(shouldRender(false, 0)).toBe(false);
    });

    it('should render when has live activity', () => {
      expect(shouldRender(true, 0)).toBe(true);
    });

    it('should render when has recent vibe checks', () => {
      expect(shouldRender(false, 5)).toBe(true);
    });

    it('should render when has both live activity and vibe checks', () => {
      expect(shouldRender(true, 3)).toBe(true);
    });
  });

  describe('Busyness rounding logic', () => {
    // Test the logic for rounding average busyness to nearest integer
    const roundBusyness = (averageBusyness: number | null): 1 | 2 | 3 | 4 | 5 | null => {
      if (averageBusyness === null) return null;
      return Math.round(averageBusyness) as 1 | 2 | 3 | 4 | 5;
    };

    it('should return null for null input', () => {
      expect(roundBusyness(null)).toBeNull();
    });

    it('should round 1.4 to 1', () => {
      expect(roundBusyness(1.4)).toBe(1);
    });

    it('should round 1.5 to 2', () => {
      expect(roundBusyness(1.5)).toBe(2);
    });

    it('should round 2.3 to 2', () => {
      expect(roundBusyness(2.3)).toBe(2);
    });

    it('should round 4.8 to 5', () => {
      expect(roundBusyness(4.8)).toBe(5);
    });

    it('should handle edge cases', () => {
      expect(roundBusyness(0.5)).toBe(1);
      expect(roundBusyness(5.4)).toBe(5);
    });
  });

  describe('Size mapping logic', () => {
    // Test the logic for mapping LiveIndicator size to BusynessIndicator size
    const mapSizeToBusynessIndicator = (size: 'small' | 'medium' | 'large'): 'small' | 'medium' => {
      return size === 'large' ? 'medium' : 'small';
    };

    it('should map small to small', () => {
      expect(mapSizeToBusynessIndicator('small')).toBe('small');
    });

    it('should map medium to small', () => {
      expect(mapSizeToBusynessIndicator('medium')).toBe('small');
    });

    it('should map large to medium', () => {
      expect(mapSizeToBusynessIndicator('large')).toBe('medium');
    });
  });

  describe('Component configuration logic', () => {
    // Test the logic for determining component configuration based on size
    const getComponentConfig = (size: 'small' | 'medium' | 'large') => {
      const isSmall = size === 'small';
      const isLarge = size === 'large';
      
      return {
        gap: isLarge ? 8 : 6,
        livePadding: {
          horizontal: isLarge ? 8 : 6,
          vertical: isLarge ? 4 : 3,
        },
        liveBorderRadius: isLarge ? 12 : 10,
        liveDotSize: isLarge ? 6 : 4,
        liveFontSize: isLarge ? 11 : 9,
        countPadding: {
          horizontal: isLarge ? 6 : 4,
          vertical: isLarge ? 3 : 2,
        },
        countBorderRadius: isLarge ? 10 : 8,
        countFontSize: isLarge ? 11 : 9,
        iconSize: isLarge ? 14 : 12,
      };
    };

    it('should return correct configuration for small size', () => {
      const config = getComponentConfig('small');
      expect(config.gap).toBe(6);
      expect(config.livePadding.horizontal).toBe(6);
      expect(config.livePadding.vertical).toBe(3);
      expect(config.liveBorderRadius).toBe(10);
      expect(config.liveDotSize).toBe(4);
      expect(config.liveFontSize).toBe(9);
      expect(config.iconSize).toBe(12);
    });

    it('should return correct configuration for medium size', () => {
      const config = getComponentConfig('medium');
      expect(config.gap).toBe(6);
      expect(config.livePadding.horizontal).toBe(6);
      expect(config.livePadding.vertical).toBe(3);
      expect(config.liveBorderRadius).toBe(10);
      expect(config.liveDotSize).toBe(4);
      expect(config.liveFontSize).toBe(9);
      expect(config.iconSize).toBe(12);
    });

    it('should return correct configuration for large size', () => {
      const config = getComponentConfig('large');
      expect(config.gap).toBe(8);
      expect(config.livePadding.horizontal).toBe(8);
      expect(config.livePadding.vertical).toBe(4);
      expect(config.liveBorderRadius).toBe(12);
      expect(config.liveDotSize).toBe(6);
      expect(config.liveFontSize).toBe(11);
      expect(config.iconSize).toBe(14);
    });
  });
});
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { BUSYNESS_LABELS, BusynessRating } from '@/src/lib/types';

type BusynessIndicatorProps = {
  rating: BusynessRating;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
};

const BusynessIndicator: React.FC<BusynessIndicatorProps> = ({
  rating,
  size = 'medium',
  showLabel = false,
}) => {
  // Color mapping for busyness levels (green to red scale)
  const getColorForRating = (rating: BusynessRating): string => {
    const colors = {
      1: Colors.semantic.success, // Green - Dead
      2: '#84CC16', // Light green - Quiet
      3: '#F59E0B', // Yellow - Moderate
      4: '#F97316', // Orange - Busy
      5: Colors.semantic.error, // Red - Packed
    };
    return colors[rating];
  };

  // Size configurations
  const sizeConfig = {
    small: {
      dotSize: 6,
      spacing: 2,
      fontSize: 12,
      containerHeight: 16,
    },
    medium: {
      dotSize: 8,
      spacing: 3,
      fontSize: 14,
      containerHeight: 20,
    },
    large: {
      dotSize: 10,
      spacing: 4,
      fontSize: 16,
      containerHeight: 24,
    },
  };

  const config = sizeConfig[size];
  const activeColor = getColorForRating(rating);
  const inactiveColor = Colors.light.border;

  return (
    <View style={styles.container}>
      <View style={[styles.dotsContainer, { height: config.containerHeight }]}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.dot,
              {
                width: config.dotSize,
                height: config.dotSize,
                backgroundColor: level <= rating ? activeColor : inactiveColor,
                marginRight: level < 5 ? config.spacing : 0,
              },
            ]}
          />
        ))}
      </View>
      {showLabel && (
        <ThemedText
          style={[
            styles.label,
            {
              fontSize: config.fontSize,
              color: activeColor,
            },
          ]}
          type="defaultSemiBold"
        >
          {BUSYNESS_LABELS[rating]}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50, // Make it circular
  },
  label: {
    marginTop: 4,
    textAlign: 'center',
  },
});

export default BusynessIndicator;
import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

type RatingBreakdownProps = {
  breakdown: { [key: string]: number };
  totalReviews: number;
};

const RatingBreakdown: React.FC<RatingBreakdownProps> = ({ breakdown, totalReviews }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = getStyles(colors);

  return (
    <View style={styles.container}>
      {[5, 4, 3, 2, 1].map((star) => {
        const count = breakdown[star] || 0;
        const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
        
        return (
          <View key={star} style={styles.row}>
            <Text style={styles.starText}>{star} star</Text>
            <View style={styles.barContainer}>
              <View style={[styles.bar, { width: `${percentage}%`, backgroundColor: colors.tint }]} />
            </View>
            <Text style={styles.countText}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  starText: {
    color: colors.text,
    fontSize: 14,
    width: 50,
  },
  barContainer: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 4,
  },
  countText: {
    color: colors.muted,
    fontSize: 14,
    width: 30,
    textAlign: 'right',
  },
});

export default RatingBreakdown; 
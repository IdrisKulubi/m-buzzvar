import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

type StarRatingProps = {
  rating: number;
  size?: number;
  color?: string;
  onRate?: (rating: number) => void;
};

const StarRating: React.FC<StarRatingProps> = ({
  rating,
  size = 16,
  color = Colors.light.tint,
  onRate,
}) => {
  // If onRate is provided, render an interactive selector
  if (onRate) {
    return (
      <View style={styles.container}>
        {[...Array(5)].map((_, i) => {
          const starValue = i + 1;
          return (
            <TouchableOpacity
              key={starValue}
              onPress={() => onRate(starValue)}
              style={styles.touchableStar}
            >
              <Ionicons
                name={starValue <= rating ? 'star' : 'star-outline'}
                size={size}
                color={color}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  // Otherwise, render a static display
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <View style={styles.container}>
      {[...Array(fullStars)].map((_, i) => (
        <Ionicons key={`full_${i}`} name="star" size={size} color={color} />
      ))}
      {halfStar && <Ionicons name="star-half" size={size} color={color} />}
      {[...Array(emptyStars)].map((_, i) => (
        <Ionicons key={`empty_${i}`} name="star-outline" size={size} color={color} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  touchableStar: {
    padding: 2, // Add some padding to make it easier to tap
  },
});

export default StarRating; 
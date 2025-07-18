import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import VenueCardSkeleton from './VenueCardSkeleton';

export default function SwipeFeedSkeleton() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 16,
      paddingTop: 16,
    },
  });

  return (
    <View style={styles.container}>
      <VenueCardSkeleton />
      <VenueCardSkeleton />
      <VenueCardSkeleton />
    </View>
  );
}
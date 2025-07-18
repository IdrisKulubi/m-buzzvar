import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import SkeletonBox from './SkeletonBox';

export default function VenueCardSkeleton() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    cardContent: {
      padding: 16,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 8,
    },
    detailsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 16,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });

  return (
    <View style={styles.card}>
      {/* Image skeleton */}
      <SkeletonBox width="100%" height={200} borderRadius={0} />

      <View style={styles.cardContent}>
        {/* Title skeleton */}
        <SkeletonBox width="70%" height={24} style={{ marginBottom: 8 }} />
        
        {/* Rating skeleton */}
        <View style={styles.ratingContainer}>
          <SkeletonBox width={90} height={18} />
          <SkeletonBox width={120} height={14} />
        </View>

        {/* Description skeleton */}
        <SkeletonBox width="100%" height={16} style={{ marginBottom: 6 }} />
        <SkeletonBox width="80%" height={16} style={{ marginBottom: 12 }} />

        {/* Address skeleton */}
        <View style={styles.detailsRow}>
          <SkeletonBox width={16} height={16} />
          <SkeletonBox width="60%" height={14} style={{ marginLeft: 10 }} />
        </View>

        {/* Hours skeleton */}
        <View style={styles.detailsRow}>
          <SkeletonBox width={16} height={16} />
          <SkeletonBox width="40%" height={14} style={{ marginLeft: 10 }} />
        </View>
      </View>

      {/* Actions skeleton */}
      <View style={styles.cardActions}>
        <View style={styles.actionButton}>
          <SkeletonBox width={22} height={22} />
          <SkeletonBox width={30} height={14} />
        </View>
        <View style={styles.actionButton}>
          <SkeletonBox width={22} height={22} />
          <SkeletonBox width={35} height={14} />
        </View>
        <View style={styles.actionButton}>
          <SkeletonBox width={22} height={22} />
          <SkeletonBox width={45} height={14} />
        </View>
      </View>
    </View>
  );
}
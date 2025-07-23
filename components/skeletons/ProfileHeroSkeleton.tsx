import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import SkeletonBox from './SkeletonBox';

export default function ProfileHeroSkeleton() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    heroSection: {
      padding: 24,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatarSkeleton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      marginBottom: 16,
    },
    nameSkeleton: {
      marginBottom: 8,
    },
    universitySkeleton: {
      marginTop: 4,
    },
    editButtonSkeleton: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 36,
      height: 36,
      borderRadius: 18,
    },
  });

  return (
    <View style={styles.heroSection}>
      <SkeletonBox 
        width={120} 
        height={120} 
        borderRadius={60}
        style={styles.avatarSkeleton}
      />
      <SkeletonBox 
        width={200} 
        height={26} 
        borderRadius={6}
        style={styles.nameSkeleton}
      />
      <SkeletonBox 
        width={150} 
        height={16} 
        borderRadius={4}
        style={styles.universitySkeleton}
      />
      <SkeletonBox 
        width={36} 
        height={36} 
        borderRadius={18}
        style={styles.editButtonSkeleton}
      />
    </View>
  );
}
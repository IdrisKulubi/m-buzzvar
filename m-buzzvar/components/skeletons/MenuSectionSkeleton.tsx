import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import SkeletonBox from './SkeletonBox';
import MenuItemSkeleton from './MenuItemSkeleton';

interface MenuSectionSkeletonProps {
  title?: string;
  itemCount?: number;
  hasSubText?: boolean;
  hasSwitch?: boolean;
}

export default function MenuSectionSkeleton({ 
  title,
  itemCount = 2,
  hasSubText = true,
  hasSwitch = false 
}: MenuSectionSkeletonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    menuSection: {
      marginTop: 32,
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    titleContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
  });

  return (
    <View style={styles.menuSection}>
      <View style={styles.titleContainer}>
        <SkeletonBox 
          width={title ? title.length * 8 : 120} 
          height={18} 
          borderRadius={4}
        />
      </View>
      {Array.from({ length: itemCount }).map((_, index) => (
        <MenuItemSkeleton 
          key={index}
          isLast={index === itemCount - 1}
          hasSubText={hasSubText}
          hasSwitch={hasSwitch && index === itemCount - 1} // Only last item has switch for dark mode
        />
      ))}
    </View>
  );
}
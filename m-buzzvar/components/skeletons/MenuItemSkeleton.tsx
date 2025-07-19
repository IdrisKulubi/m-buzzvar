import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import SkeletonBox from './SkeletonBox';

interface MenuItemSkeletonProps {
  isLast?: boolean;
  hasSubText?: boolean;
  hasSwitch?: boolean;
}

export default function MenuItemSkeleton({ 
  isLast = false, 
  hasSubText = true,
  hasSwitch = false 
}: MenuItemSkeletonProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: colors.border,
    },
    menuItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconSkeleton: {
      width: 32,
      height: 32,
      borderRadius: 8,
      marginRight: 16,
    },
    textContainer: {
      flex: 1,
    },
    textSkeleton: {
      marginBottom: hasSubText ? 4 : 0,
    },
    subTextSkeleton: {
      marginTop: 2,
    },
    chevronSkeleton: {
      width: 20,
      height: 20,
      borderRadius: 4,
    },
    switchSkeleton: {
      width: 50,
      height: 30,
      borderRadius: 15,
    },
  });

  return (
    <View style={styles.menuItem}>
      <View style={styles.menuItemContent}>
        <SkeletonBox 
          width={32} 
          height={32} 
          borderRadius={8}
          style={styles.iconSkeleton}
        />
        <View style={styles.textContainer}>
          <SkeletonBox 
            width="70%" 
            height={16} 
            borderRadius={4}
            style={styles.textSkeleton}
          />
          {hasSubText && (
            <SkeletonBox 
              width="50%" 
              height={12} 
              borderRadius={3}
              style={styles.subTextSkeleton}
            />
          )}
        </View>
      </View>
      {hasSwitch ? (
        <SkeletonBox 
          width={50} 
          height={30} 
          borderRadius={15}
          style={styles.switchSkeleton}
        />
      ) : (
        <SkeletonBox 
          width={20} 
          height={20} 
          borderRadius={4}
          style={styles.chevronSkeleton}
        />
      )}
    </View>
  );
}
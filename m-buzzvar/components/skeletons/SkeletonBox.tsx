import React from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export default function SkeletonBox({ 
  width = '100%', 
  height = 20, 
  borderRadius = 8,
  style 
}: SkeletonBoxProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    skeleton: {
      backgroundColor: colors.border,
      opacity: 0.6,
    },
  });

  return (
    <View 
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
        },
        style
      ]} 
    />
  );
}
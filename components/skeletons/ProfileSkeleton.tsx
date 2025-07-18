import React from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import ProfileHeroSkeleton from './ProfileHeroSkeleton';
import MenuSectionSkeleton from './MenuSectionSkeleton';
import SkeletonBox from './SkeletonBox';

export default function ProfileSkeleton() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    signOutButtonSkeleton: {
      marginHorizontal: 16,
      marginTop: 32,
      marginBottom: 16,
      height: 48,
      borderRadius: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Skeleton */}
        <ProfileHeroSkeleton />

        {/* Account Section Skeleton */}
        <MenuSectionSkeleton 
          title="Account"
          itemCount={2}
          hasSubText={true}
        />

        {/* Preferences Section Skeleton */}
        <MenuSectionSkeleton 
          title="Preferences"
          itemCount={1}
          hasSubText={true}
          hasSwitch={true}
        />

        {/* Support Section Skeleton */}
        <MenuSectionSkeleton 
          title="Support"
          itemCount={2}
          hasSubText={false}
        />

        {/* Sign Out Button Skeleton */}
        <SkeletonBox 
          height={48} 
          borderRadius={12}
          style={styles.signOutButtonSkeleton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
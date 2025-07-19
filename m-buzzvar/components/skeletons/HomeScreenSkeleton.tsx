import React from 'react';
import { View, StyleSheet, ScrollView, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import SkeletonBox from './SkeletonBox';

export default function HomeScreenSkeleton() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingVertical: 20,
      paddingBottom: 120,
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    sectionContainer: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    horizontalList: {
      paddingHorizontal: 20,
      flexDirection: 'row',
    },
    featuredCard: {
      width: 300,
      marginRight: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    featuredContent: {
      padding: 12,
    },
    bookmarkCard: {
      width: 150,
      marginRight: 12,
    },
    vibesSection: {
      paddingHorizontal: 20,
      marginBottom: 32,
    },
    vibeCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    vibeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    vibeContent: {
      marginLeft: 12,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Skeleton */}
        <View style={styles.header}>
          <SkeletonBox width="60%" height={28} style={{ marginBottom: 8 }} />
          <SkeletonBox width="40%" height={16} />
        </View>

        {/* Featured Venues Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <SkeletonBox width={140} height={22} />
            <SkeletonBox width={60} height={32} borderRadius={16} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {[...Array(3)].map((_, index) => (
                <View key={index} style={styles.featuredCard}>
                  <SkeletonBox width="100%" height={160} borderRadius={0} />
                  <View style={styles.featuredContent}>
                    <SkeletonBox width="80%" height={16} style={{ marginBottom: 8 }} />
                    <SkeletonBox width="60%" height={12} />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Live Vibes Section */}
        <View style={styles.vibesSection}>
          <View style={styles.sectionHeader}>
            <SkeletonBox width={120} height={22} />
            <SkeletonBox width={60} height={32} borderRadius={16} />
          </View>
          {[...Array(3)].map((_, index) => (
            <View key={index} style={styles.vibeCard}>
              <View style={styles.vibeHeader}>
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <View style={styles.vibeContent}>
                  <SkeletonBox width={120} height={16} style={{ marginBottom: 4 }} />
                  <SkeletonBox width={80} height={12} />
                </View>
              </View>
              <SkeletonBox width="100%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonBox width="70%" height={14} />
            </View>
          ))}
        </View>

        {/* Bookmarks Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <SkeletonBox width={140} height={22} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.horizontalList}>
              {[...Array(4)].map((_, index) => (
                <View key={index} style={styles.bookmarkCard}>
                  <SkeletonBox width="100%" height={100} borderRadius={12} />
                  <SkeletonBox width="80%" height={14} style={{ marginTop: 8, alignSelf: 'center' }} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
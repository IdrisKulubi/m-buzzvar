import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import LiveFeed from '@/components/LiveFeed';
import { Colors } from '@/constants/Colors';
import { VibeCheckWithDetails } from '@/src/lib/types';

export default function LiveScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const [refreshing, setRefreshing] = useState(false);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // 30 seconds

    setAutoRefreshInterval(interval);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    // The LiveFeed component will handle the actual refresh
    // This just manages the refreshing state
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleVibeCheckPress = useCallback((vibeCheck: VibeCheckWithDetails) => {
    try {
      // Navigate to venue detail page
      // Using the venue ID to navigate to the venue details
      router.push(`/venue/${vibeCheck.venue_id}`);
    } catch (error) {
      // If navigation fails, show an alert with venue info
      Alert.alert(
        vibeCheck.venue.name,
        `${vibeCheck.user.name} rated this venue ${vibeCheck.busyness_rating}/5 for busyness.\n\n${vibeCheck.comment || 'No comment provided.'}`,
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  }, []);

  const handleError = useCallback((error: string) => {
    Alert.alert(
      'Connection Error',
      error,
      [
        { 
          text: 'Retry', 
          onPress: handleRefresh,
          style: 'default'
        },
        { 
          text: 'OK', 
          style: 'cancel'
        }
      ]
    );
  }, [handleRefresh]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.container}>
        <LiveFeed
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onVibeCheckPress={handleVibeCheckPress}
        />
      </View>
    </SafeAreaView>
  );
} 
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/lib/hooks';
import { checkUserProfile } from '@/src/actions/auth';

export default function InitialScreen() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const handleNavigation = async () => {
      if (!loading) {
        if (user) {
          // User is authenticated, check if they have a profile
          const { hasProfile } = await checkUserProfile(user.id);
          
          if (hasProfile) {
            // User has profile, go to main app
            router.replace('/(tabs)');
          } else {
            // User needs to set up profile
            router.replace('/setup-profile');
          }
        } else {
          // User is not authenticated, go to login
          router.replace('/login');
        }
      }
    };

    handleNavigation();
  }, [user, loading]);

  // Show loading screen while auth state is being determined
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>🎉</Text>
        <Text style={styles.appName}>Buzzvar</Text>
      </View>
      <ActivityIndicator size="large" color="#ef4444" style={styles.loader} />
      <Text style={styles.loadingText}>Loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: 64,
    marginBottom: 12,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
}); 
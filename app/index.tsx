import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/lib/hooks';
import { checkUserProfile } from '@/src/actions/auth';
import AnimatedSplashScreen from '@/src/components/AnimatedSplashScreen';

export default function InitialScreen() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigation = async () => {
    console.log('🔵 Index: Navigation check - loading:', loading, 'user:', !!user);
    
    if (!loading && !isNavigating) {
      setIsNavigating(true);
      
      if (user) {
        console.log('🔵 Index: User authenticated, checking profile for:', user.email);
        
        // User is authenticated, check if they have a profile
        const { hasProfile, error } = await checkUserProfile(user.id);
        
        if (error) {
          console.error('🔴 Index: Error checking profile:', JSON.stringify(error, null, 2));
        }
        
        console.log('🔵 Index: Profile check result - hasProfile:', hasProfile);
        
        if (hasProfile) {
          // User has profile, go to main app
          console.log('🟢 Index: User has profile, navigating to main app');
          router.replace('/(tabs)');
        } else {
          // User needs to set up profile
          console.log('🟡 Index: User needs profile setup, navigating to setup');
          router.replace('/setup-profile');
        }
      } else {
        // User is not authenticated, go to login
        console.log('🔵 Index: No user, navigating to login');
        router.replace('/login');
      }
    }
  };

  useEffect(() => {
    // Only start navigation logic after splash animation is complete
    if (!showSplash) {
      handleNavigation();
    }
  }, [user, loading, showSplash]);

  const handleAnimationComplete = () => {
    console.log('🎬 Index: Splash animation completed');
    setShowSplash(false);
  };

  // Show animated splash screen first
  if (showSplash) {
    return <AnimatedSplashScreen onAnimationComplete={handleAnimationComplete} />;
  }

  // Show loading screen while auth state is being determined
  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo/buzzvarlogo.png')}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text style={styles.appName}>Buzzvar</Text>
      </View>
      <ActivityIndicator size="large" color="oklch(0.83 0.1 83.77)" style={styles.loader} />
      <Text style={styles.loadingText}>Crunching the data up...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 2,
  },
  loader: {
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#b3b3b3',
    letterSpacing: 0.5,
  },
}); 
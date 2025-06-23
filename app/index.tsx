import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/lib/hooks';
import { checkUserProfile } from '@/src/actions/auth';
import AnimatedSplashScreen from '@/src/components/AnimatedSplashScreen';

export default function InitialScreen() {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasNavigated, setHasNavigated] = useState(false);

  const performNavigation = async () => {
    console.log('🔵 Index: Performing navigation - loading:', loading, 'user:', !!user);
    console.log('🔵 Index: Current router state before navigation');
    
    try {
      if (user) {
        console.log('🔵 Index: User authenticated, checking profile for:', user.email);
        
        // User is authenticated, check if they have a profile
        const { hasProfile, error } = await checkUserProfile(user.id);
        
        if (error) {
          console.error('🔴 Index: Error checking profile:', JSON.stringify(error, null, 2));
          // On error, still try to navigate to setup
          console.log('🟡 Index: Profile check failed, navigating to setup');
          router.replace('/setup-profile');
          return;
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
        console.log('🔵 Index: About to call router.replace("/login")');
        router.replace('/login');
        console.log('🔵 Index: router.replace("/login") called');
      }
    } catch (error) {
      console.error('🔴 Index: Navigation error:', error);
      // Fallback navigation
      if (user) {
        router.replace('/setup-profile');
      } else {
        router.replace('/login');
      }
    }
  };

  // Main navigation effect - triggers on auth state changes
  useEffect(() => {
    console.log('🔵 Index: Auth state changed - loading:', loading, 'user:', !!user, 'showSplash:', showSplash, 'hasNavigated:', hasNavigated);
    
    // Navigate when auth state is determined and splash is complete
    // OR when auth state changes after initial navigation (like sign out)
    if (!loading && (!showSplash || hasNavigated)) {
      console.log('🔵 Index: Ready to navigate, performing navigation...');
      performNavigation();
    }
  }, [user, loading, showSplash]);

  // Reset navigation flag when auth state changes (for smooth transitions)
  useEffect(() => {
    if (!loading) {
      setHasNavigated(false);
    }
  }, [user, loading]);

  const handleAnimationComplete = () => {
    console.log('🎬 Index: Splash animation completed');
    setShowSplash(false);
    setHasNavigated(true);
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
      <ActivityIndicator size="large" color="#D4AF37" style={styles.loader} />
      <Text style={styles.loadingText}>
        {loading ? 'Loading your session...' : 'Navigating...'}
      </Text>
      {/* Debug info */}
      <Text style={styles.debugText}>
        Loading: {loading.toString()} | User: {user ? 'Yes' : 'No'} | Splash: {showSplash.toString()}
      </Text>
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
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    marginTop: 8,
  },
}); 
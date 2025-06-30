import React, { useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text, useColorScheme } from 'react-native';
import AnimatedSplashScreen from '@/src/components/AnimatedSplashScreen';
import { Colors } from '@/constants/Colors';

export default function InitialScreen() {
  const [splashAnimationComplete, setSplashAnimationComplete] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
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
      color: colors.text,
      letterSpacing: 2,
    },
    loader: {
      marginBottom: 16,
    },
    loadingText: {
      fontSize: 16,
      color: colors.muted,
      letterSpacing: 0.5,
      marginBottom: 8,
    },
  });

  // Show the animated splash screen first
  if (!splashAnimationComplete) {
    return <AnimatedSplashScreen onAnimationComplete={() => setSplashAnimationComplete(true)} />;
  }

  // After splash, show a loading indicator. The root layout will handle navigation.
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
      <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
      <Text style={styles.loadingText}>
        Loading your session...
      </Text>
    </View>
  );
} 
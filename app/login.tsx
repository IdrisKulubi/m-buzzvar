import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, useColorScheme, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import Button from '../src/components/Button';
import { signInWithGoogle } from '../src/actions/auth';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark'; // Default to dark for premium look
  const colors = Colors[colorScheme];

  const handleGoogleLogin = async () => {
    console.log('🔵 Login: Starting Google login process...');
    setLoading(true);
    
    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        console.error('🔴 Login: Google login error:', JSON.stringify(error, null, 2));
        Alert.alert('Login Failed', (error as any)?.message || 'An error occurred during Google login');
      } else if (data?.user) {
        console.log('🟢 Login: Google login successful for user:', data.user.email);
        console.log('🔵 Login: User will be redirected to profile setup or main app based on profile status');
        // Navigation will be handled by the index.tsx useEffect
      } else {
        console.log('🟡 Login: No error but no user data received');
        Alert.alert('Login Failed', 'No user data received');
      }
    } catch (error) {
      console.error('🔴 Login: Unexpected error:', JSON.stringify(error, null, 2));
      Alert.alert('Login Failed', 'An unexpected error occurred');
    } finally {
      console.log('🔵 Login: Finished Google login process');
      setLoading(false);
    }
  };

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={
            colorScheme === 'dark' 
              ? ['#000000', '#1a1a1a', '#2d2d2d'] 
              : ['#ffffff', '#f8f9fa', '#e9ecef']
          }
          style={styles.gradient}
          locations={[0, 0.6, 1]}
        >
          {/* Top Section with Logo */}
          <View style={styles.topSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/logo/buzzvarlogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colorScheme === 'dark' ? '#ffffff' : '#000000' }]}>
                Welcome to Buzzvar
              </Text>
              <Text style={[styles.subtitle, { color: colorScheme === 'dark' ? '#b3b3b3' : '#666666' }]}>
                Your gateway to the best party experiences
              </Text>
            </View>

            <View style={styles.buttonSection}>
              <Button
                title="Continue with Google"
                onPress={handleGoogleLogin}
                loading={loading}
                variant="google"
                fullWidth
                size="large"
                icon={<Ionicons name="logo-google" size={24} color="#4285F4" />}
              />
              
              <Text style={[styles.termsText, { color: colorScheme === 'dark' ? '#999999' : '#777777' }]}>
                By continuing, you agree to our Terms of Service and Privacy Policy
              </Text>
            </View>
          </View>

          {/* Decorative Gold Accents */}
          <View style={[styles.goldAccent1, { backgroundColor: 'oklch(0.83 0.1 83.77)' }]} />
          <View style={[styles.goldAccent2, { backgroundColor: 'oklch(0.83 0.1 83.77)' }]} />
          <View style={[styles.goldAccent3, { backgroundColor: 'oklch(0.83 0.1 83.77)' }]} />
        </LinearGradient>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  gradient: {
    flex: 1,
  },
  topSection: {
    flex: 0.45,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  logoContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 70,
    borderWidth: 2,
    borderColor: 'oklch(0.83 0.1 83.77)',
    shadowColor: 'oklch(0.83 0.1 83.77)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  logo: {
    width: 100,
    height: 100,
  },
  contentSection: {
    flex: 0.55,
    paddingHorizontal: 32,
    justifyContent: 'space-between',
    paddingBottom: 60,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    letterSpacing: 0.3,
    maxWidth: 300,
    fontWeight: '400',
  },
  buttonSection: {
    gap: 24,
  },
  termsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
    fontWeight: '400',
  },
  // Gold decorative accents
  goldAccent1: {
    position: 'absolute',
    top: 100,
    right: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.15,
  },
  goldAccent2: {
    position: 'absolute',
    bottom: 200,
    left: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    opacity: 0.2,
  },
  goldAccent3: {
    position: 'absolute',
    top: 300,
    left: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.1,
  },
}); 
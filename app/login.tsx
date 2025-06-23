import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../src/components/Button';
import { signInWithGoogle } from '../src/actions/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        Alert.alert('Login Failed', error.message || 'An error occurred during Google login');
      } else if (data?.user) {
        console.log('Google login successful');
      }
    } catch (error) {
      Alert.alert('Login Failed', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand Section */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>🎉</Text>
          </View>
          <Text style={styles.title}>Welcome to Buzzvar</Text>
          <Text style={styles.subtitle}>
            Discover clubs and create unforgettable party experiences
          </Text>
        </View>

        {/* Google Sign In */}
        <Button
          title="Continue with Google"
          onPress={handleGoogleLogin}
          loading={loading}
          fullWidth
          size="large"
          icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
          style={styles.googleButton}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  googleButton: {
    marginTop: 24,
  },
}); 
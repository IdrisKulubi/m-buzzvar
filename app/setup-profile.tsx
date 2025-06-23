import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/src/lib/hooks';
import Button from '../src/components/Button';
import Input from '../src/components/Input';
import { createUserProfile } from '../src/actions/auth';

export default function SetupProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [university, setUniversity] = useState('');
  const [loading, setLoading] = useState(false);

  // Log when user arrives at profile setup
  React.useEffect(() => {
    console.log('🟡 ProfileSetup: User arrived at profile setup page');
    console.log('🔵 ProfileSetup: User email:', user?.email);
    console.log('🔵 ProfileSetup: Pre-filled name:', name);
  }, []);

  const handleSaveProfile = async () => {
    console.log('🔵 ProfileSetup: Starting profile creation...');
    
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name to continue');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    setLoading(true);
    try {
      console.log('🔵 ProfileSetup: Creating profile with data:', {
        name: name.trim(),
        university: university.trim() || null,
        email: user.email,
      });

      const { error } = await createUserProfile({
        id: user.id,
        email: user.email!,
        name: name.trim(),
        university: university.trim() || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      });

      if (error) {
        console.error('🔴 ProfileSetup: Profile creation failed:', JSON.stringify(error, null, 2));
        Alert.alert('Error', 'Failed to save profile. Please try again.');
      } else {
        console.log('🟢 ProfileSetup: Profile created successfully, navigating to main app');
        // Profile created successfully, navigate to main app
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('🔴 ProfileSetup: Unexpected error:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Just a few details to get you started
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={name}
              onChangeText={setName}
              leftIcon="person"
              autoCapitalize="words"
              autoComplete="name"
            />

            <Input
              label="University (Optional)"
              placeholder="Enter your university"
              value={university}
              onChangeText={setUniversity}
              leftIcon="school"
              autoCapitalize="words"
            />

            <Button
              title="Complete Setup"
              onPress={handleSaveProfile}
              loading={loading}
              fullWidth
              size="large"
              style={styles.saveButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
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
  form: {
    gap: 16,
  },
  saveButton: {
    marginTop: 24,
  },
}); 
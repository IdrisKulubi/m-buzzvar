import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, KeyboardAvoidingView, Platform, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/src/lib/hooks';
import Button from '../src/components/Button';
import Input from '../src/components/Input';
import { createUserProfile } from '../src/actions/standalone-actions';
import { Colors } from '../constants/Colors';

export default function SetupProfilePage() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name || user?.user_metadata?.name || '');
  const [university, setUniversity] = useState('');
  const [loading, setLoading] = useState(false);
  const colorScheme = useColorScheme() ?? 'dark'; // Default to dark for premium look
  const colors = Colors[colorScheme];

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
        console.log('🟢 ProfileSetup: Profile created successfully');
        console.log('🔵 ProfileSetup: Triggering navigation to main app...');
        
        // Small delay to ensure profile is saved, then navigate
        setTimeout(() => {
          console.log('🔵 ProfileSetup: Navigating to main app');
          router.replace('/(tabs)');
        }, 500);
      }
    } catch (error) {
      console.error('🔴 ProfileSetup: Unexpected error:', JSON.stringify(error, null, 2));
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colorScheme === 'dark' ? '#000000' : '#ffffff',
    },
    gradient: {
      flex: 1,
    },
    keyboardView: {
      flex: 1,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    progressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 32,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: colors.surface,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      width: '50%', // 50% complete
      backgroundColor: colors.tint,
      borderRadius: 2,
    },
    progressText: {
      fontSize: 14,
      color: colorScheme === 'dark' ? '#b3b3b3' : '#666666',
      marginLeft: 12,
      fontWeight: '600',
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colorScheme === 'dark' ? '#ffffff' : '#000000',
      textAlign: 'center',
      marginBottom: 16,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 18,
      color: colorScheme === 'dark' ? '#b3b3b3' : '#666666',
      textAlign: 'center',
      lineHeight: 28,
      letterSpacing: 0.2,
      maxWidth: 280,
    },
    form: {
      gap: 24,
    },
    saveButton: {
      marginTop: 32,
    },
    brandAccent: {
      position: 'absolute',
      top: 60,
      right: 20,
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.tint,
      opacity: 0.08,
    },
    brandAccent2: {
      position: 'absolute',
      bottom: 100,
      left: -10,
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.tint,
      opacity: 0.12,
    },
  });

  return (
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
        {/* Decorative elements */}
        <View style={styles.brandAccent} />
        <View style={styles.brandAccent2} />
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              {/* Progress indicator */}
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.progressText}>2 of 3</Text>
              </View>
              
              <Text style={styles.title}>Complete Your Profile</Text>
              <Text style={styles.subtitle}>
                Just a few details to get you started on your party journey
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
                variant="primary"
                fullWidth
                size="large"
                style={styles.saveButton}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
} 
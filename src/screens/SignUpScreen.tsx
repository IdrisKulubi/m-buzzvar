import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Button from '../components/Button'
import Input from '../components/Input'
import { signUp, signInWithGoogle } from '../actions/auth'

interface SignUpScreenProps {
  onNavigateToLogin: () => void
}

export default function SignUpScreen({ onNavigateToLogin }: SignUpScreenProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    university: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignUp = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const { data, error } = await signUp({
        email: formData.email.trim(),
        password: formData.password,
        name: formData.name.trim(),
        university: formData.university.trim() || undefined,
      })

      if (error) {
        console.error('Sign-up error details:', JSON.stringify(error, null, 2))
        if (error.message?.includes('already registered')) {
          Alert.alert(
            'Account Exists',
            'An account with this email already exists. Please sign in instead.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign In', onPress: onNavigateToLogin },
            ]
          )
        } else {
          Alert.alert('Sign Up Failed', error.message || 'An error occurred during sign up')
        }
      } else if (data?.user) {
        Alert.alert(
          'Account Created!',
          'Please check your email to verify your account before signing in.',
          [{ text: 'OK', onPress: onNavigateToLogin }]
        )
      }
    } catch (error) {
      console.error('Caught an unexpected error during sign-up:', JSON.stringify(error, null, 2))
      Alert.alert('Sign Up Failed', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true)
    try {
      const { data, error } = await signInWithGoogle()

      if (error) {
        Alert.alert('Google Sign Up Failed', (error as any)?.message || 'An error occurred during Google sign up')
      } else if (data?.user) {
        console.log('Google sign up successful')
      }
    } catch (error) {
      Alert.alert('Google Sign Up Failed', 'An unexpected error occurred')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>🎉</Text>
            </View>
            <Text style={styles.title}>Join Buzzvar</Text>
            <Text style={styles.subtitle}>
              Create your account and start discovering amazing venues
            </Text>
          </View>

          {/* Sign Up Form */}
          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              value={formData.name}
              onChangeText={(value) => updateFormData('name', value)}
              leftIcon="person"
              autoCapitalize="words"
              autoComplete="name"
              error={errors.name}
            />

            <Input
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
              onChangeText={(value) => updateFormData('email', value)}
              leftIcon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="University (Optional)"
              placeholder="Enter your university"
              value={formData.university}
              onChangeText={(value) => updateFormData('university', value)}
              leftIcon="school"
              autoCapitalize="words"
              error={errors.university}
            />

            <Input
              label="Password"
              placeholder="Create a password"
              value={formData.password}
              onChangeText={(value) => updateFormData('password', value)}
              leftIcon="lock-closed"
              secureTextEntry
              autoComplete="password-new"
              error={errors.password}
            />

            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(value) => updateFormData('confirmPassword', value)}
              leftIcon="lock-closed"
              secureTextEntry
              autoComplete="password-new"
              error={errors.confirmPassword}
            />

            <Button
              title="Create Account"
              onPress={handleSignUp}
              loading={loading}
              disabled={googleLoading}
              fullWidth
              size="large"
              style={styles.signUpButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign Up */}
          <Button
            title="Continue with Google"
            onPress={handleGoogleSignUp}
            variant="google"
            loading={googleLoading}
            disabled={loading}
            fullWidth
            size="large"
            icon={
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            }
          />

          {/* Terms and Privacy */}
          <Text style={styles.termsText}>
            By creating an account, you agree to our{' '}
            <Text style={styles.linkText}>Terms of Service</Text> and{' '}
            <Text style={styles.linkText}>Privacy Policy</Text>
          </Text>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Button
              title="Sign In"
              onPress={onNavigateToLogin}
              variant="outline"
              size="small"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ef4444',
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
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  form: {
    marginBottom: 32,
  },
  signUpButton: {
    marginTop: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  termsText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 24,
    marginBottom: 16,
  },
  linkText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    fontSize: 16,
    color: '#6b7280',
  },
}) 
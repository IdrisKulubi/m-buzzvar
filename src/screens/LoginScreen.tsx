import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Button from '../components/Button'
import Input from '../components/Input'
import { signIn, signInWithGoogle } from '../actions/auth'
import { useAuth } from '../lib/hooks'

interface LoginScreenProps {
  onNavigateToSignUp: () => void
  onNavigateToForgotPassword: () => void
}

export default function LoginScreen({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEmailLogin = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const { data, error } = await signIn({ email: email.trim(), password })

      if (error) {
        Alert.alert('Login Failed', error.message || 'An error occurred during login')
      } else if (data?.user) {
        // Success - navigation will be handled by the auth state change
        console.log('Login successful')
      }
    } catch (error) {
      Alert.alert('Login Failed', 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const { data, error } = await signInWithGoogle()

      if (error) {
        Alert.alert('Google Login Failed', (error as any)?.message || 'An error occurred during Google login')
      } else if (data?.user) {
        console.log('Google login successful')
      }
    } catch (error) {
      Alert.alert('Google Login Failed', 'An unexpected error occurred')
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
        >
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

          {/* Login Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              leftIcon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errors.email}
            />

            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              leftIcon="lock-closed"
              secureTextEntry
              autoComplete="password"
              error={errors.password}
            />

            <Button
              title="Sign In"
              onPress={handleEmailLogin}
              loading={loading}
              disabled={googleLoading}
              fullWidth
              size="large"
            />

            {/* Forgot Password */}
            <Button
              title="Forgot Password?"
              onPress={onNavigateToForgotPassword}
              variant="outline"
              size="small"
              style={styles.forgotButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <Button
            title="Continue with Google"
            onPress={handleGoogleLogin}
            variant="google"
            loading={googleLoading}
            disabled={loading}
            fullWidth
            size="large"
            icon={
              <Ionicons name="logo-google" size={20} color="#4285F4" />
            }
          />

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Button
              title="Sign Up"
              onPress={onNavigateToSignUp}
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
    marginBottom: 48,
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
  forgotButton: {
    alignSelf: 'center',
    marginTop: 16,
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
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 16,
    color: '#6b7280',
  },
}) 
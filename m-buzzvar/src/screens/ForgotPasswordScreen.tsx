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
import { resetPassword } from '../actions/auth'

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void
}

export default function ForgotPasswordScreen({
  onNavigateToLogin,
}: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email)
  }

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Email is required')
      return
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address')
      return
    }

    setError('')
    setLoading(true)

    try {
      const { error } = await resetPassword(email.trim())

      if (error) {
        setError((error as any)?.message || 'An error occurred while sending reset email')
      } else {
        setEmailSent(true)
      }
    } catch (error) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (emailSent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.successContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="mail" size={48} color="#10b981" />
            </View>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successMessage}>
              We've sent a password reset link to{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
            <Text style={styles.instructionText}>
              Click the link in the email to reset your password. If you don't see it, check your spam folder.
            </Text>
            
            <Button
              title="Back to Sign In"
              onPress={onNavigateToLogin}
              fullWidth
              size="large"
              style={styles.backButton}
            />
            
            <Button
              title="Resend Email"
              onPress={handleResetPassword}
              variant="outline"
              loading={loading}
              fullWidth
              size="medium"
            />
          </View>
        </View>
      </SafeAreaView>
    )
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
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={32} color="#ef4444" />
            </View>
            <Text style={styles.title}>Forgot Password?</Text>
            <Text style={styles.subtitle}>
              No worries! Enter your email address and we'll send you a link to reset your password.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email Address"
              placeholder="Enter your email"
              value={email}
              onChangeText={(text) => {
                setEmail(text)
                if (error) setError('')
              }}
              leftIcon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={error}
            />

            <Button
              title="Send Reset Link"
              onPress={handleResetPassword}
              loading={loading}
              fullWidth
              size="large"
              style={styles.resetButton}
            />
          </View>

          {/* Back to Login */}
          <View style={styles.footer}>
            <Button
              title="← Back to Sign In"
              onPress={onNavigateToLogin}
              variant="outline"
              size="medium"
              icon={<Ionicons name="arrow-back" size={16} color="#ef4444" />}
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
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
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
  resetButton: {
    marginTop: 8,
  },
  footer: {
    alignItems: 'center',
  },
  successContainer: {
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: '#1f2937',
  },
  instructionText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  backButton: {
    marginBottom: 16,
  },
}) 
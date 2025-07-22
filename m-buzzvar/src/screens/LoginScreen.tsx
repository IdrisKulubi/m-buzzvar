import React, { useState } from "react";
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
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export default function LoginScreen({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailLogin = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { user, error } = await signInWithEmail(email.trim(), password);

      if (error) {
        Alert.alert(
          "Login Failed",
          error.message || "An error occurred during login"
        );
      } else if (user) {
        // Success - navigation will be handled by the auth state change
        console.log("Login successful");
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Failed", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { user, error } = await signInWithGoogle();

      if (error) {
        console.error('🔴 LoginScreen: Google login error:', error.message);
        
        // Show user-friendly error messages
        if (error.message.includes('not available') || error.message.includes('install and configure')) {
          Alert.alert(
            'Google Sign-In Unavailable', 
            'Google Sign-In is not properly configured. Please use email login instead.',
            [{ text: 'OK' }]
          );
        } else if (error.message.includes('cancelled')) {
          // Don't show alert for user cancellation
          console.log('🟡 LoginScreen: User cancelled Google sign-in');
        } else if (error.message.includes('Play Services')) {
          Alert.alert(
            'Google Play Services Required', 
            'Please update Google Play Services to use Google Sign-In.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert(
            "Google Login Failed",
            error.message || "An error occurred during Google login"
          );
        }
      } else if (user) {
        console.log("🟢 LoginScreen: Google login successful for user:", user.email);
      }
    } catch (error) {
      console.error('🔴 LoginScreen: Unexpected Google login error:', error);
      Alert.alert("Google Login Failed", "An unexpected error occurred");
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo/Brand Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>✨</Text>
            </View>
            <Text style={styles.title}>hey bestie 👋</Text>
            <Text style={styles.subtitle}>
              ready to find your vibe? let&apos;s get you logged in
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
              title="let's go ✨"
              onPress={handleEmailLogin}
              loading={loading}
              disabled={googleLoading}
              fullWidth
              size="large"
            />

            {/* Forgot Password */}
            <Button
              title="forgot password? no worries"
              onPress={onNavigateToForgotPassword}
              variant="outline"
              size="small"
              style={styles.forgotButton}
            />
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign In */}
          <Button
            title="sign in with google"
            onPress={handleGoogleLogin}
            variant="google"
            loading={googleLoading}
            disabled={loading}
            fullWidth
            size="large"
            icon={<Ionicons name="logo-google" size={20} color="#4285F4" />}
          />

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>new here? </Text>
            <Button
              title="join the party"
              onPress={onNavigateToSignUp}
              variant="outline"
              size="small"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a", // Dark background for modern look
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 56,
    marginTop: 20,
  },
  logoContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    // Subtle gradient effect with border
    borderWidth: 2,
    borderColor: "#ff6b6b",
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 17,
    color: "#a1a1aa",
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "400",
    maxWidth: 280,
  },
  form: {
    marginBottom: 40,
    gap: 20, // Modern spacing
  },
  forgotButton: {
    alignSelf: "center",
    marginTop: 20,
    backgroundColor: "transparent",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 36,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#27272a",
  },
  dividerText: {
    marginHorizontal: 20,
    fontSize: 15,
    color: "#71717a",
    fontWeight: "500",
    textTransform: "lowercase",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    gap: 8,
  },
  footerText: {
    fontSize: 16,
    color: "#a1a1aa",
    fontWeight: "400",
  },
});

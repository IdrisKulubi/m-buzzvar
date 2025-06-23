import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  useColorScheme,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/src/lib/hooks'
import { getUserProfile } from '@/src/actions/auth'
import { signOut } from '@/src/actions/auth'
import Button from '@/src/components/Button'

interface UserProfile {
  id: string
  name: string | null
  email: string
  university: string | null
  avatar_url: string | null
  created_at: string
}

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = Colors[colorScheme]
  const { user } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await getUserProfile(user.id)
      if (error) {
        console.error('Error loading profile:', error)
      } else {
        setProfile(data)
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadProfile()
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut()
            if (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.')
            }
          },
        },
      ]
    )
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.muted,
    },
    scrollContent: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 32,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 18,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 26,
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
      elevation: 3,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatarContainer: {
      marginRight: 16,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 2,
      borderColor: colors.tint,
    },
    avatarPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.background,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 14,
      color: colors.muted,
      marginBottom: 4,
    },
    profileUniversity: {
      fontSize: 14,
      color: colors.tint,
      fontWeight: '600',
    },
    featuresCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    featuresTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    featuresList: {
      gap: 16,
    },
    featureItem: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
      fontWeight: '500',
    },
    signOutButton: {
      marginTop: 20,
      marginBottom: 40,
    },
  })

  useEffect(() => {
    loadProfile()
  }, [user])

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to Buzzvar! 🎉</Text>
          <Text style={styles.subtitle}>Your party planning companion</Text>
        </View>

        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  style={styles.avatar}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.name || 'Anonymous User'}
              </Text>
              <Text style={styles.profileEmail}>{profile?.email}</Text>
              {profile?.university && (
                <Text style={styles.profileUniversity}>
                  🎓 {profile.university}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Features Coming Soon */}
        <View style={styles.featuresCard}>
          <Text style={styles.featuresTitle}>Coming Soon</Text>
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>🏪 Discover nearby clubs</Text>
            <Text style={styles.featureItem}>👥 Create party groups</Text>
            <Text style={styles.featureItem}>💬 Group chat</Text>
            <Text style={styles.featureItem}>📍 Location-based recommendations</Text>
            <Text style={styles.featureItem}>🔖 Bookmark favorite venues</Text>
          </View>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          style={styles.signOutButton}
        />
      </ScrollView>
    </SafeAreaView>
  )
} 
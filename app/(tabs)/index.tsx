import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  useColorScheme,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import { Colors } from '@/constants/Colors'
import { useAuth } from '@/src/lib/hooks'
import { getUserProfile } from '@/src/actions/auth'
import { getVenues, getUserBookmarks, VenueWithDistance } from '@/src/actions/clubs'
import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'

interface UserProfile {
  id: string
  name: string | null
  email: string
  university: string | null
  avatar_url: string | null
  created_at: string
}

// Dummy data for groups until we have the real thing
const dummyGroups = [
  { id: '1', name: 'Friday Night Pre-game', members: 8, venue: 'The Pint House' },
  { id: '2', name: 'Saturday Rooftop Vibes', members: 5, venue: 'The Sky Lounge' },
]

export default function HomeScreen() {
  const colorScheme = useColorScheme() ?? 'dark'
  const colors = Colors[colorScheme]
  const { user } = useAuth()
  
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [featuredVenues, setFeaturedVenues] = useState<VenueWithDistance[]>([])
  const [bookmarkedVenues, setBookmarkedVenues] = useState<VenueWithDistance[]>([])
  
  const loadDashboardData = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      // Fetch all data in parallel for speed
      const [
        profileResult,
        venuesResult,
        bookmarksResult,
      ] = await Promise.all([
        getUserProfile(user.id),
        getVenues(), // For now, just get general venues
        getUserBookmarks(user.id),
      ])

      if (profileResult.error) console.error('Error loading profile:', profileResult.error)
      else setProfile(profileResult.data)
      
      if (venuesResult.error) console.error('Error fetching venues:', venuesResult.error)
      else {
        // Feature venues with promotions or just the first few
        const featured = venuesResult.data?.filter(v => v.promotions && v.promotions.length > 0) || []
        setFeaturedVenues(featured.length > 0 ? featured : venuesResult.data?.slice(0, 5) || [])
      }
      
      if (bookmarksResult.error) console.error('Error fetching bookmarks:', bookmarksResult.error)
      else setBookmarkedVenues(bookmarksResult.data || [])

    } catch (error) {
      console.error('Error loading dashboard data:', error)
      Alert.alert('Error', 'Could not load your dashboard. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadDashboardData()
    setRefreshing(false)
  }

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

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
    scrollContent: {
      paddingVertical: 20,
      paddingBottom: 120, // Extra padding for tab bar
    },
    header: {
      paddingHorizontal: 20,
      marginBottom: 24,
    },
    greetingText: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    headerSubtitle: {
      fontSize: 16,
      color: colors.muted,
      marginTop: 4,
    },
    sectionContainer: {
      marginBottom: 32,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
    },
    seeAllButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.surface,
    },
    seeAllText: {
      color: colors.tint,
      fontWeight: '600',
    },
    horizontalList: {
      paddingHorizontal: 20,
    },
    featuredCard: {
      width: 300,
      marginRight: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    featuredImage: {
      width: '100%',
      height: 160,
      backgroundColor: colors.border,
    },
    featuredContent: {
      padding: 12,
    },
    featuredTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    featuredAddress: {
      fontSize: 12,
      color: colors.muted,
      flexShrink: 1,
    },
    promotionBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: colors.tint,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 20,
      gap: 6,
    },
    promotionText: {
      color: colors.background,
      fontSize: 12,
      fontWeight: 'bold',
    },
    groupCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginHorizontal: 20,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    groupIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupInfo: {
      flex: 1,
    },
    groupName: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    groupDetails: {
      fontSize: 14,
      color: colors.muted,
      marginTop: 2,
    },
    bookmarkCard: {
      width: 150,
      marginRight: 12,
    },
    bookmarkImage: {
      width: '100%',
      height: 100,
      borderRadius: 12,
      backgroundColor: colors.border,
    },
    bookmarkTitle: {
      marginTop: 8,
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    emptyStateContainer: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 16,
    },
    emptyStateText: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
      fontSize: 14,
    },
  })

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.tint} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greetingText}>
            Welcome, {profile?.name?.split(' ')[0] || 'Explorer'}
          </Text>
          <Text style={styles.headerSubtitle}>
            What&apos;s the buzz tonight?
          </Text>
        </View>

        {/* Featured Venues */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Venues</Text>
            <TouchableOpacity 
              style={styles.seeAllButton} 
              onPress={() => router.push('/(tabs)/explore')}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {featuredVenues.map((venue) => (
              <TouchableOpacity key={venue.id} style={styles.featuredCard}>
                <Image source={{ uri: venue.cover_image_url || 'https://placehold.co/600x400' }} style={styles.featuredImage} />
                {venue.promotions && venue.promotions.length > 0 && (
                  <View style={styles.promotionBadge}>
                    <Ionicons name="star" size={12} color={colors.background} />
                    <Text style={styles.promotionText}>Promotion</Text>
                  </View>
                )}
                <View style={styles.featuredContent}>
                  <Text style={styles.featuredTitle} numberOfLines={1}>{venue.name}</Text>
                  <Text style={styles.featuredAddress} numberOfLines={1}>{venue.address}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Your Groups */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            <TouchableOpacity 
              style={styles.seeAllButton}
              onPress={() => router.push('/(tabs)/groups')}
            >
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {dummyGroups.map((group) => (
            <TouchableOpacity key={group.id} style={styles.groupCard}>
              <View style={styles.groupIcon}>
                <Ionicons name="people" size={24} color={colors.background} />
              </View>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupDetails}>{group.members} members • {group.venue}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bookmarked Venues */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Bookmarks</Text>
          </View>
          {bookmarkedVenues.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
              {bookmarkedVenues.map((venue) => (
                <TouchableOpacity key={venue.id} style={styles.bookmarkCard}>
                  <Image source={{ uri: venue.cover_image_url || 'https://placehold.co/400x400' }} style={styles.bookmarkImage} />
                  <Text style={styles.bookmarkTitle} numberOfLines={1}>{venue.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Ionicons name="bookmark-outline" size={32} color={colors.muted} />
              <Text style={styles.emptyStateText}>
                You haven&apos;t bookmarked any venues yet. Start exploring
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
} 
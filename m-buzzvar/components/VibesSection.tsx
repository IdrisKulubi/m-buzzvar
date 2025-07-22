import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { getRecentVibeChecks } from '@/src/actions/clubs';
import BusynessIndicator from './BusynessIndicator';

interface VibeCheckWithDetails {
  id: string;
  venue_id: string;
  user_id: string;
  busyness_rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  photo_url?: string;
  created_at: string;
  time_ago: string;
  is_recent: boolean;
  user: {
    id: string;
    name: string;
    avatar_url?: string;
  };
  venue: {
    id: string;
    name: string;
    address?: string;
    cover_image_url?: string;
  };
}

interface VibesSectionProps {
  onRefresh?: () => void;
}

export default function VibesSection({ onRefresh }: VibesSectionProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const [vibeChecks, setVibeChecks] = useState<VibeCheckWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVibeChecks = useCallback(async () => {
    try {
      const { data, error } = await getRecentVibeChecks(8);
      if (error) {
        console.error('Error loading vibe checks:', error);
      } else {
        setVibeChecks(data);
      }
    } catch (error) {
      console.error('Error loading vibe checks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVibeChecks();
  }, [loadVibeChecks]);

  const handleVibeCheckPress = (vibeCheck: VibeCheckWithDetails) => {
    // Navigate to venue details or live feed
    router.push('/(tabs)/live');
  };

  const handleSeeAllPress = () => {
    router.push('/(tabs)/live');
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 32,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    title: {
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
    vibeCard: {
      width: 280,
      marginRight: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
    },
    vibeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 8,
    },
    userAvatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.border,
    },
    userInfo: {
      flex: 1,
    },
    userName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
    },
    timeAgo: {
      fontSize: 12,
      color: colors.muted,
    },
    busynessContainer: {
      alignItems: 'center',
    },
    vibeContent: {
      paddingHorizontal: 12,
      paddingBottom: 12,
    },
    venueInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      gap: 6,
    },
    venueName: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.tint,
      flex: 1,
    },
    comment: {
      fontSize: 14,
      color: colors.text,
      lineHeight: 18,
    },
    vibePhoto: {
      width: '100%',
      height: 120,
      backgroundColor: colors.border,
      marginTop: 8,
      borderRadius: 8,
    },
    loadingContainer: {
      height: 120,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 20,
    },
    emptyContainer: {
      padding: 20,
      alignItems: 'center',
      backgroundColor: colors.surface,
      marginHorizontal: 20,
      borderRadius: 16,
    },
    emptyText: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 8,
      fontSize: 14,
    },
    liveIndicator: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: colors.tint,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    liveText: {
      color: colors.background,
      fontSize: 10,
      fontWeight: 'bold',
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.background,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Vibes</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      </View>
    );
  }

  if (vibeChecks.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Live Vibes</Text>
          <TouchableOpacity style={styles.seeAllButton} onPress={handleSeeAllPress}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="pulse-outline" size={32} color={colors.muted} />
          <Text style={styles.emptyText}>
            No recent vibes yet. Be the first to share what&apos;s happening!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Vibes</Text>
        <TouchableOpacity style={styles.seeAllButton} onPress={handleSeeAllPress}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        contentContainerStyle={styles.horizontalList}
      >
        {vibeChecks.map((vibeCheck) => (
          <TouchableOpacity 
            key={vibeCheck.id} 
            style={styles.vibeCard}
            onPress={() => handleVibeCheckPress(vibeCheck)}
          >
            {vibeCheck.is_recent && (
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            
            <View style={styles.vibeHeader}>
              <Image 
                source={{ 
                  uri: vibeCheck.user.avatar_url || 'https://placehold.co/64x64' 
                }} 
                style={styles.userAvatar} 
              />
              <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>
                  {vibeCheck.user.name}
                </Text>
                <Text style={styles.timeAgo}>
                  {vibeCheck.time_ago}
                </Text>
              </View>
              <View style={styles.busynessContainer}>
                <BusynessIndicator 
                  rating={vibeCheck.busyness_rating} 
                  size="small" 
                />
              </View>
            </View>

            <View style={styles.vibeContent}>
              <View style={styles.venueInfo}>
                <Ionicons name="location" size={14} color={colors.tint} />
                <Text style={styles.venueName} numberOfLines={1}>
                  {vibeCheck.venue.name}
                </Text>
              </View>
              
              {vibeCheck.comment && (
                <Text style={styles.comment} numberOfLines={3}>
                  {vibeCheck.comment}
                </Text>
              )}
              
              {vibeCheck.photo_url && (
                <Image 
                  source={{ uri: vibeCheck.photo_url }} 
                  style={styles.vibePhoto}
                  contentFit="cover"
                />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
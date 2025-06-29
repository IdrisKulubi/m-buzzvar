import { supabase } from '@/src/lib/supabase';
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Image,
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/src/lib/hooks';
import { useToast } from '@/src/lib/ToastProvider';
import { toggleBookmark, recordClubView } from '@/src/actions/clubs';

const SwipeFeed: React.FC = () => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { showToast } = useToast();

  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const styles = useMemo(() => getStyles(colors), [colors]);

  const fetchVenues = useCallback(async () => {
    setLoading(true);
    let bookmarkedIds = new Set();
    
    if (user) {
      const { data: bookmarksData } = await supabase
        .from('user_bookmarks')
        .select('venue_id')
        .eq('user_id', user.id);
      if (bookmarksData) {
        bookmarkedIds = new Set(bookmarksData.map(b => b.venue_id));
      }
    }

    const { data, error } = await supabase
      .from('venues')
      .select('*, menus(*), promotions(*)')
      .limit(20);

    if (error) {
      console.error('Error fetching venues:', error);
      showToast({ type: 'error', message: "Couldn't fetch venues" });
    } else {
      const processedVenues = data.map(v => ({
        ...v,
        isBookmarked: bookmarkedIds.has(v.id),
        isLiked: false, // Placeholder for like state
      }));
      setVenues(processedVenues);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchVenues();
  }, [user]);

  const handleInteraction = useCallback((venueId: string, action: 'like' | 'save') => {
    if (!user) {
      showToast({ type: 'error', message: 'You need to be logged in to do that!' });
      return;
    }

    const originalVenues = [...venues];
    let optimisticState, endpointCall, successMessage;

    if (action === 'save') {
      const venue = venues.find(v => v.id === venueId);
      const isCurrentlyBookmarked = venue?.isBookmarked;

      optimisticState = { isBookmarked: !isCurrentlyBookmarked };
      endpointCall = () => toggleBookmark(venueId, user.id);
      successMessage = isCurrentlyBookmarked ? "Removed from your faves" : "Saved to your faves ✨";
    } else { // like
      optimisticState = { isLiked: true };
      endpointCall = () => recordClubView(venueId, user.id, 'like');
      successMessage = "You liked this spot! 🔥";
    }

    // Optimistic UI update
    setVenues(current =>
      current.map(v => (v.id === venueId ? { ...v, ...optimisticState } : v))
    );
    
    endpointCall().then(({ error }) => {
      if (error) {
        setVenues(originalVenues); // Revert on error
        showToast({ type: 'error', message: "Couldn't save that. Try again." });
      } else {
        showToast({ type: 'success', message: successMessage });
      }
    });
  }, [user, venues, showToast]);

  const handleRefresh = useCallback(async () => {
    await fetchVenues();
  }, [fetchVenues]);

  const formatHours = (hours: string | null) => {
    if (!hours) return 'Hours not available';

    try {
      const hoursObj = JSON.parse(hours);
      const today = new Date().toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
      const todayHours = hoursObj[today];

      if (todayHours === 'closed') return 'Closed Today';
      if (todayHours) return `Open: ${todayHours}`;
      
      return 'Hours not specified';
    } catch (e) {
      return hours;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.cover_image_url || 'https://placehold.co/600x400' }}
        style={styles.cardImage}
      />
      
      {item.promotions.length > 0 && (
        <View style={styles.promotionBadge}>
          <Ionicons name="star" size={14} color={colors.background} />
          <Text style={styles.promotionText}>{item.promotions[0].title}</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.detailsRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.detailsText} numberOfLines={1}>{item.address}</Text>
        </View>

        <View style={styles.detailsRow}>
          <Feather name="clock" size={16} color={colors.muted} />
          <Text style={styles.detailsText}>
            {formatHours(item.hours)}
          </Text>
        </View>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleInteraction(item.id, 'like')}>
          <Ionicons 
            name={item.isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={item.isLiked ? colors.destructive : colors.text} 
          />
          <Text style={[styles.actionText, item.isLiked && { color: colors.destructive }]}>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={() => handleInteraction(item.id, 'save')}>
          <Ionicons 
            name={item.isBookmarked ? "bookmark" : "bookmark-outline"} 
            size={22} 
            color={item.isBookmarked ? colors.tint : colors.text} 
          />
          <Text style={[styles.actionText, item.isBookmarked && { color: colors.tint }]}>Save</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="arrow-forward" size={22} color={colors.text} />
          <Text style={styles.actionText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={styles.loadingText}>Finding venues...</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={venues}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
      onRefresh={handleRefresh}
      refreshing={loading}
    />
  );
};

const getStyles = (colors: typeof Colors.dark) => StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardImage: {
    width: '100%',
    height: 200,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: colors.border,
  },
  promotionBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: colors.tint,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
  },
  promotionText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: 16,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 14,
    color: colors.text,
    marginLeft: 10,
    flexShrink: 1,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 8,
  },
  actionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text,
    marginTop: 10,
  },
});

export default SwipeFeed;
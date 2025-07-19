import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  useColorScheme,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import VibeCheckCard from './VibeCheckCard';
import { Colors } from '@/constants/Colors';
import { VibeCheckWithDetails } from '@/src/lib/types';
import { VibeCheckService } from '@/src/services/VibeCheckService';
import { VibeCheckRealtimeService } from '@/src/services/VibeCheckRealtimeService';
import { ImageCacheService } from '@/src/services/ImageCacheService';
import { Ionicons } from '@expo/vector-icons';
import { AppError } from '@/src/lib/errors';
import ErrorDisplay from './ErrorDisplay';

interface LiveFeedProps {
  refreshing: boolean;
  onRefresh: () => void;
  onVibeCheckPress: (vibeCheck: VibeCheckWithDetails) => void;
}

interface GroupedVibeCheck {
  venue_id: string;
  venue_name: string;
  venue_address?: string;
  vibe_checks: VibeCheckWithDetails[];
}

const LiveFeed: React.FC<LiveFeedProps> = ({
  refreshing,
  onRefresh,
  onVibeCheckPress,
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const [vibeChecks, setVibeChecks] = useState<VibeCheckWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  // Group vibe checks by venue
  const groupedVibeChecks = React.useMemo(() => {
    const groups: { [key: string]: GroupedVibeCheck } = {};
    
    vibeChecks.forEach((vibeCheck) => {
      const venueId = vibeCheck.venue_id;
      if (!groups[venueId]) {
        groups[venueId] = {
          venue_id: venueId,
          venue_name: vibeCheck.venue.name,
          venue_address: vibeCheck.venue.address,
          vibe_checks: [],
        };
      }
      groups[venueId].vibe_checks.push(vibeCheck);
    });

    // Convert to array and sort by most recent vibe check
    return Object.values(groups).sort((a, b) => {
      const aLatest = new Date(a.vibe_checks[0]?.created_at || 0);
      const bLatest = new Date(b.vibe_checks[0]?.created_at || 0);
      return bLatest.getTime() - aLatest.getTime();
    });
  }, [vibeChecks]);

  const fetchVibeChecks = useCallback(async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await VibeCheckService.getLiveVibeChecks(4, 50);
      
      if (fetchError) {
        setError(fetchError);
      } else {
        setVibeChecks(data);
        
        // Preload images for better performance
        const imageUrls = data
          .filter(vc => vc.photo_url)
          .map(vc => vc.photo_url!)
          .slice(0, 10); // Preload first 10 images
        
        if (imageUrls.length > 0) {
          ImageCacheService.preloadImages(imageUrls, { priority: 'low' });
        }
      }
    } catch (err) {
      console.error('Failed to fetch vibe checks:', err);
      setError(err as AppError);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    await fetchVibeChecks();
    setIsRetrying(false);
  }, [fetchVibeChecks]);

  // Set up real-time subscription
  useEffect(() => {
    const subscriptionId = 'live-feed-subscription';
    
    const setupRealtimeSubscription = async () => {
      try {
        const result = await VibeCheckRealtimeService.subscribe(subscriptionId, {
          onVibeCheckInsert: (newVibeCheck) => {
            setVibeChecks(prev => {
              // Add new vibe check to the beginning and remove duplicates
              const filtered = prev.filter(vc => vc.id !== newVibeCheck.id);
              return [newVibeCheck, ...filtered].slice(0, 50); // Keep only 50 most recent
            });
            
            // Preload new image if available
            if (newVibeCheck.photo_url) {
              ImageCacheService.getCachedImage(newVibeCheck.photo_url, { priority: 'high' });
            }
          },
          onVibeCheckUpdate: (updatedVibeCheck) => {
            setVibeChecks(prev => 
              prev.map(vc => vc.id === updatedVibeCheck.id ? updatedVibeCheck : vc)
            );
          },
          onVibeCheckDelete: (vibeCheckId) => {
            setVibeChecks(prev => prev.filter(vc => vc.id !== vibeCheckId));
          },
          onError: (error) => {
            console.error('Real-time subscription error:', error);
          },
        });
        
        if (!result.success) {
          console.warn('Failed to establish real-time connection:', result.error);
        }
      } catch (error) {
        console.error('Error setting up real-time subscription:', error);
      }
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount
    return () => {
      VibeCheckRealtimeService.unsubscribe(subscriptionId);
    };
  }, []);

  useEffect(() => {
    fetchVibeChecks();
  }, [fetchVibeChecks]);

  const handleRefresh = useCallback(() => {
    onRefresh();
    fetchVibeChecks();
  }, [onRefresh, fetchVibeChecks]);

  const handleVibeCheckPress = useCallback((vibeCheck: VibeCheckWithDetails) => {
    onVibeCheckPress(vibeCheck);
  }, [onVibeCheckPress]);

  const renderVenueGroup = ({ item }: { item: GroupedVibeCheck }) => (
    <View style={styles.venueGroup}>
      {/* Venue Header */}
      <View style={[styles.venueHeader, { backgroundColor: colors.surface }]}>
        <View style={styles.venueInfo}>
          <Ionicons 
            name="location" 
            size={20} 
            color={colors.tint} 
          />
          <View style={styles.venueDetails}>
            <ThemedText type="defaultSemiBold" style={styles.venueName}>
              {item.venue_name}
            </ThemedText>
            {item.venue_address && (
              <ThemedText style={[styles.venueAddress, { color: colors.muted }]}>
                {item.venue_address}
              </ThemedText>
            )}
          </View>
        </View>
        <View style={[styles.vibeCountBadge, { backgroundColor: colors.tint }]}>
          <ThemedText style={[styles.vibeCountText, { color: colors.background }]}>
            {item.vibe_checks.length}
          </ThemedText>
        </View>
      </View>

      {/* Vibe Checks for this venue */}
      {item.vibe_checks.map((vibeCheck) => (
        <VibeCheckCard
          key={vibeCheck.id}
          vibeCheck={vibeCheck}
          showVenue={false}
          onVenuePress={() => handleVibeCheckPress(vibeCheck)}
        />
      ))}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIconContainer, { backgroundColor: colors.surface }]}>
        <Ionicons name="pulse-outline" size={48} color={colors.muted} />
      </View>
      <ThemedText type="title" style={[styles.emptyTitle, { color: colors.text }]}>
        No Live Vibes Yet
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: colors.muted }]}>
        Be the first to share what&apos;s happening at a venue! Pull down to refresh and check for new updates.
      </ThemedText>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.errorState}>
      {error && (
        <ErrorDisplay
          error={error}
          onRetry={error.retryable ? handleRetry : undefined}
          isRetrying={isRetrying}
        />
      )}
    </View>
  );

  const renderSkeletonCard = () => (
    <View style={[styles.skeletonCard, { backgroundColor: colors.surface }]}>
      {/* Header skeleton */}
      <View style={styles.skeletonHeader}>
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonAvatar, { backgroundColor: colors.border }]} />
          <View style={styles.skeletonUserInfo}>
            <View style={[styles.skeletonText, styles.skeletonUserName, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonText, styles.skeletonTimestamp, { backgroundColor: colors.border }]} />
          </View>
        </View>
      </View>
      
      {/* Busyness skeleton */}
      <View style={styles.skeletonBusynessSection}>
        <View style={[styles.skeletonBusyness, { backgroundColor: colors.border }]} />
        <View style={[styles.skeletonLiveIndicator, { backgroundColor: colors.border }]} />
      </View>
      
      {/* Comment skeleton */}
      <View style={styles.skeletonCommentSection}>
        <View style={[styles.skeletonText, styles.skeletonCommentLine1, { backgroundColor: colors.border }]} />
        <View style={[styles.skeletonText, styles.skeletonCommentLine2, { backgroundColor: colors.border }]} />
      </View>
      
      {/* Photo skeleton */}
      <View style={[styles.skeletonPhoto, { backgroundColor: colors.border }]} />
      
      {/* Venue footer skeleton */}
      <View style={styles.skeletonVenueFooter}>
        <View style={[styles.skeletonText, styles.skeletonVenueText, { backgroundColor: colors.border }]} />
      </View>
    </View>
  );

  const renderSkeletonVenueGroup = () => (
    <View style={styles.skeletonVenueGroup}>
      {/* Venue header skeleton */}
      <View style={[styles.skeletonVenueHeader, { backgroundColor: colors.surface }]}>
        <View style={styles.skeletonRow}>
          <View style={[styles.skeletonLocationIcon, { backgroundColor: colors.border }]} />
          <View style={styles.skeletonVenueInfo}>
            <View style={[styles.skeletonText, styles.skeletonVenueName, { backgroundColor: colors.border }]} />
            <View style={[styles.skeletonText, styles.skeletonVenueAddress, { backgroundColor: colors.border }]} />
          </View>
        </View>
        <View style={[styles.skeletonCountBadge, { backgroundColor: colors.border }]} />
      </View>
      
      {/* Skeleton cards for this venue */}
      {renderSkeletonCard()}
      {renderSkeletonCard()}
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      {renderSkeletonVenueGroup()}
      {renderSkeletonVenueGroup()}
      {renderSkeletonVenueGroup()}
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        {renderLoadingState()}
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
        <FlatList
          data={[]}
          renderItem={() => null}
          ListEmptyComponent={renderErrorState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          contentContainerStyle={styles.contentContainer}
        />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={groupedVibeChecks}
        renderItem={renderVenueGroup}
        keyExtractor={(item) => item.venue_id}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.tint}
            colors={[colors.tint]}
          />
        }
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 8,
  },
  venueGroup: {
    marginBottom: 24,
  },
  venueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  venueDetails: {
    marginLeft: 12,
    flex: 1,
  },
  venueName: {
    fontSize: 18,
    marginBottom: 2,
  },
  venueAddress: {
    fontSize: 14,
  },
  vibeCountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 32,
    alignItems: 'center',
  },
  vibeCountText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    marginBottom: 12,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    paddingVertical: 8,
  },
  skeletonVenueGroup: {
    marginBottom: 24,
  },
  skeletonVenueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  skeletonCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
  },
  skeletonHeader: {
    marginBottom: 12,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  skeletonUserInfo: {
    flex: 1,
  },
  skeletonText: {
    borderRadius: 4,
    opacity: 0.6,
  },
  skeletonUserName: {
    height: 16,
    width: '40%',
    marginBottom: 4,
  },
  skeletonTimestamp: {
    height: 12,
    width: '25%',
  },
  skeletonBusynessSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skeletonBusyness: {
    height: 24,
    width: 120,
    borderRadius: 12,
  },
  skeletonLiveIndicator: {
    height: 24,
    width: 50,
    borderRadius: 12,
  },
  skeletonCommentSection: {
    marginBottom: 12,
  },
  skeletonCommentLine1: {
    height: 15,
    width: '90%',
    marginBottom: 6,
  },
  skeletonCommentLine2: {
    height: 15,
    width: '70%',
  },
  skeletonPhoto: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  skeletonVenueFooter: {
    paddingTop: 8,
  },
  skeletonVenueText: {
    height: 14,
    width: '60%',
  },
  skeletonLocationIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 12,
  },
  skeletonVenueInfo: {
    flex: 1,
  },
  skeletonVenueName: {
    height: 18,
    width: '50%',
    marginBottom: 4,
  },
  skeletonVenueAddress: {
    height: 14,
    width: '70%',
  },
  skeletonCountBadge: {
    width: 32,
    height: 28,
    borderRadius: 16,
  },
});

export default LiveFeed;
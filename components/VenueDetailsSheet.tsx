import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import StarRating from './StarRating';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AddReviewSheet from './AddReviewSheet';
import AddVibeCheckSheet from '../components/AddVibeCheckSheet';
import { supabase } from '../src/lib/supabase';

function formatDistanceToNow(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    const years = Math.floor(interval);
    return years + (years === 1 ? " year ago" : " years ago");
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    const months = Math.floor(interval);
    return months + (months === 1 ? " month ago" : " months ago");
  }
  interval = seconds / 86400;
  if (interval > 1) {
    const days = Math.floor(interval);
    return days + (days === 1 ? " day ago" : " days ago");
  }
  interval = seconds / 3600;
  if (interval > 1) {
    const hours = Math.floor(interval);
    return hours + (hours === 1 ? " hour ago" : " hours ago");
  }
  interval = seconds / 60;
  if (interval > 1) {
    const minutes = Math.floor(interval);
    return minutes + (minutes === 1 ? " minute ago" : " minutes ago");
  }
  if (seconds < 10) {
    return "just now";
  }
  return Math.floor(seconds) + " seconds ago";
}

const ReviewItem = ({ review }: { review: any }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={getStyles(colors).reviewItem}>
      <View style={getStyles(colors).reviewHeader}>
        <Text style={getStyles(colors).reviewAuthor}>{review.users?.name || 'Anonymous'}</Text>
        <StarRating rating={review.rating} size={14} color={colors.tint} />
      </View>
      <Text style={getStyles(colors).reviewComment}>{review.comment}</Text>
      <Text style={getStyles(colors).reviewDate}>
        {new Date(review.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
};

const VenueDetailsSheet = ({ venue, onDataNeedsRefresh }: { venue: any; onDataNeedsRefresh: () => void; }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);


  const addReviewSheetRef = useRef<BottomSheetModal>(null);
  const addVibeCheckSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['70%'], []);
  const vibeSnapPoints = useMemo(() => ['60%'], []);
  
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [isShowingAllReviews, setIsShowingAllReviews] = useState(false);

  const fetchReviews = useCallback(async (limit: number | null = 3) => {
    setReviewsLoading(true);
    let query = supabase
      .from('reviews')
      .select('*, users(name)')
      .eq('venue_id', venue.id)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch reviews:", error);
    } else {
      setReviews(data);
    }
    setReviewsLoading(false);
  }, [venue.id]);

  useEffect(() => {
    // Fetch initial preview
    fetchReviews(3);
  }, [fetchReviews]);

  const handlePresentAddReview = () => addReviewSheetRef.current?.present();
  const handlePresentAddVibe = () => addVibeCheckSheetRef.current?.present();
  
  const handleReviewSubmitted = () => {
    addReviewSheetRef.current?.dismiss();
    fetchReviews(isShowingAllReviews ? null : 3); 
    onDataNeedsRefresh();
  };

  const handleVibeSubmitted = () => {
    addVibeCheckSheetRef.current?.dismiss();
    onDataNeedsRefresh();
  };

  const handleViewAllReviews = () => {
    fetchReviews(null); // Fetch all reviews
    setIsShowingAllReviews(true);
    // Note: Sheet expansion is handled by the parent component
  };

  const handleShowSummary = () => {
    fetchReviews(3); // Go back to fetching only 3
    setIsShowingAllReviews(false);
    // Note: Sheet resizing is handled by the parent component
  };

  const formatHours = (hours: string | null) => {
    if (!hours) return 'Hours not available';
    try {
      const hoursObj = JSON.parse(hours);
      const today = new Date().toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
      return `Today: ${hoursObj[today] || 'Not specified'}`;
    } catch (e: any) {
      console.error(e);
      return hours;
    }
  };

  const renderReviewList = () => (
    <View style={{ flex: 1 }}>
       <TouchableOpacity onPress={handleShowSummary} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
          <Text style={styles.backButtonText}>Back to Details</Text>
        </TouchableOpacity>
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReviewItem review={item} />}
        contentContainerStyle={styles.listContent}
        onRefresh={() => fetchReviews(null)}
        refreshing={reviewsLoading}
        ListHeaderComponent={<Text style={styles.fullReviewsTitle}>All Reviews</Text>}
      />
    </View>
  );

  const renderSummary = () => (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: venue.cover_image_url }} style={styles.headerImage} />
      
      <View style={styles.content}>
        <Text style={styles.title}>{venue.name}</Text>
        
        <View style={styles.ratingRow}>
          <StarRating rating={venue.average_rating} size={22} color={colors.tint} />
          <Text style={styles.ratingText}>
            {venue.average_rating > 0 ? venue.average_rating.toFixed(1) : 'No Ratings'}{' '}
            ({venue.review_count} {venue.review_count === 1 ? 'review' : 'reviews'})
          </Text>
        </View>
        
        {venue.promotions?.length > 0 && (
          <View style={styles.promotionBadge}>
            <Ionicons name="star" size={16} color={colors.background} />
            <Text style={styles.promotionText}>{venue.promotions[0].title}</Text>
          </View>
        )}
        
        <Text style={styles.description}>{venue.description}</Text>
        
        <View style={styles.separator} />
        
        <Text style={styles.sectionTitle}>Reviews</Text>

        {reviewsLoading ? (
          <ActivityIndicator color={colors.tint} style={{ marginVertical: 20 }}/>
        ) : reviews.length > 0 ? (
          <>
            {reviews.map(r => <ReviewItem key={r.id} review={r} />)}
            {venue.review_count > 2 && (
              <TouchableOpacity style={styles.seeAllButton} onPress={handleViewAllReviews}>
                <Text style={styles.seeAllText}>View all {venue.review_count} reviews</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.tint} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={styles.reviewsPlaceholder}>
            <Text style={styles.infoText}>No reviews yet. Be the first!</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addReviewButton} onPress={handlePresentAddReview}>
          <Ionicons name="create-outline" size={20} color={colors.background} />
          <Text style={styles.addReviewButtonText}>Add Your Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.addReviewButton, {backgroundColor: colors.accent, marginTop: 12}]} onPress={handlePresentAddVibe}>
          <Ionicons name="flame-outline" size={20} color={colors.background} />
          <Text style={styles.addReviewButtonText}>Post a Vibe Check</Text>
        </TouchableOpacity>
        
        <View style={styles.separator} />
        
        <Text style={styles.sectionTitle}>Details</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={colors.tint} style={styles.infoIcon} />
          <Text style={styles.infoText}>{venue.address}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Feather name="clock" size={20} color={colors.tint} style={styles.infoIcon} />
          <Text style={styles.infoText}>{formatHours(venue.hours)}</Text>
        </View>
        
        {venue.contact && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.tint} style={styles.infoIcon} />
            <Text style={styles.infoText}>{venue.contact}</Text>
          </View>
        )}
      </View>

      {/* Vibe Check Section */}
      {venue.latest_vibe ? (
        <View style={styles.content}>
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Live Vibe Check 🔥</Text>
          <View style={styles.vibeCheckContainer}>
            <View style={styles.vibeInfo}>
              <Ionicons name="people" size={20} color={colors.tint} style={styles.infoIcon} />
              <Text style={styles.infoText}>
                Busyness: <Text style={{fontWeight: 'bold'}}>{['Quiet', 'Getting Busy', 'Just Right', 'Packed', 'Max Capacity'][venue.latest_vibe.busyness_rating - 1]}</Text>
              </Text>
            </View>
            <Text style={styles.vibeQuote}>&quot;{venue.latest_vibe.comment}&quot;</Text>
            <Text style={styles.vibeTime}>
              - {venue.latest_vibe.user_name || 'Anonymous'}, {formatDistanceToNow(new Date(venue.latest_vibe.created_at))}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.separator} />
          <Text style={styles.sectionTitle}>Live Vibe Check</Text>
          <View style={[styles.vibeCheckContainer, { borderLeftColor: colors.border }]}>
             <Text style={styles.infoText}>No live vibe checks right now. Be the first to post one!</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  return (
    <>
      {isShowingAllReviews ? renderReviewList() : renderSummary()}
      <BottomSheetModal
        ref={addReviewSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
      >
        <AddReviewSheet venueId={venue.id} onSubmitted={handleReviewSubmitted} />
      </BottomSheetModal>
      <BottomSheetModal
        ref={addVibeCheckSheetRef}
        index={0}
        snapPoints={vibeSnapPoints}
        backgroundStyle={{ backgroundColor: colors.surface }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
      >
        <AddVibeCheckSheet venueId={venue.id} onSubmitted={handleVibeSubmitted} />
      </BottomSheetModal>
    </>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  ratingText: {
    fontSize: 16,
    color: colors.muted,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    color: colors.muted,
    lineHeight: 24,
    marginBottom: 20,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  promotionText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  seeAllButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  seeAllText: {
    color: colors.tint,
    fontWeight: '600',
    fontSize: 16,
  },
  reviewsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
  },
  addReviewButton: {
    backgroundColor: colors.tint,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginTop: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addReviewButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
  vibeCheckContainer: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.tint,
  },
  vibeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vibeQuote: {
    fontStyle: 'italic',
    color: colors.muted,
    fontSize: 16,
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 22,
  },
  vibeTime: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  reviewItem: {
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewAuthor: {
    fontWeight: 'bold',
    color: colors.text,
  },
  reviewComment: {
    color: colors.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.muted,
    textAlign: 'right',
  },
  backButton: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  backButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.tint,
    marginLeft: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  fullReviewsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    paddingVertical: 16,
  },
});

export default VenueDetailsSheet; 
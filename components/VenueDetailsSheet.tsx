import React, { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import StarRating from './StarRating';
import RatingBreakdown from './RatingBreakdown';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import AddReviewSheet from './AddReviewSheet';
import { supabase } from '@/src/lib/supabase';

const ReviewItem = ({ review }: { review: any }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <View style={getStyles(colors).reviewItem}>
      <View style={getStyles(colors).reviewHeader}>
        <Text style={getStyles(colors).reviewAuthor}>{review.author_name || 'Anonymous'}</Text>
        <StarRating rating={review.rating} size={14} color={colors.tint} />
      </View>
      {review.comment && <Text style={getStyles(colors).reviewComment}>{review.comment}</Text>}
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

  const [reviewDetails, setReviewDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReviewDetails = useCallback(async () => {
    if (!venue.id) return;
    setLoading(true);
    const { data, error } = await supabase.rpc('get_venue_review_details', { p_venue_id: venue.id });
    
    if (error) {
      console.error("Failed to fetch review details:", error);
    } else if (data && data.length > 0) {
      setReviewDetails(data[0]);
    }
    setLoading(false);
  }, [venue.id]);

  useEffect(() => {
    fetchReviewDetails();
  }, [fetchReviewDetails]);

  // When a review is submitted from another screen, we get the signal to refresh
  useEffect(() => {
    fetchReviewDetails();
  }, [venue]); // Re-fetch if the venue object itself changes (e.g., from parent)

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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: venue.cover_image_url }} style={styles.headerImage} />
      
      <View style={styles.content}>
        <Text style={styles.title}>{venue.name}</Text>
        
        <View style={styles.ratingRow}>
          <StarRating rating={reviewDetails?.average_rating ?? 0} size={22} color={colors.tint} />
          <Text style={styles.ratingText}>
            {(reviewDetails?.average_rating ?? 0) > 0 ? reviewDetails.average_rating.toFixed(1) : 'No Ratings'}{' '}
            ({reviewDetails?.review_count ?? 0} {reviewDetails?.review_count === 1 ? 'review' : 'reviews'})
          </Text>
        </View>

        <Text style={styles.description}>{venue.description}</Text>
        
        <View style={styles.separator} />
        
        <Text style={styles.sectionTitle}>Ratings & Reviews</Text>
        
        {loading ? (
          <ActivityIndicator color={colors.tint} style={{ marginVertical: 20 }}/>
        ) : reviewDetails && reviewDetails.review_count > 0 ? (
          <>
            <RatingBreakdown 
              breakdown={reviewDetails.rating_breakdown} 
              totalReviews={reviewDetails.review_count} 
            />
            {reviewDetails.latest_reviews?.map((r: any) => <ReviewItem key={r.id} review={r} />)}
            <TouchableOpacity 
              style={styles.button} 
              onPress={() => router.push({ pathname: '/reviews', params: { venueId: venue.id, venueName: venue.name }})}
            >
              <Text style={styles.buttonText}>See all {reviewDetails.review_count} reviews</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.reviewsPlaceholder}>
            <Text style={styles.infoText}>No reviews yet. Be the first!</Text>
            {/* You can add a button here to prompt the first review */}
          </View>
        )}

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
    </ScrollView>
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
  reviewsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    marginBottom: 16,
  },
  button: {
    backgroundColor: colors.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
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
});

export default VenueDetailsSheet; 
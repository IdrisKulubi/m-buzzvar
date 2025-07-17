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
import AddVibeCheckSheet from './AddVibeCheckSheet';
import { supabase } from '../src/lib/supabase';
import { formatDistanceToNow } from '../src/lib/utils';
import { useRef, useState, useMemo } from 'react';

const ReviewItem = ({ review }: { review: any }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewAuthor}>{review.user_name}</Text>
        <StarRating rating={review.rating} />
      </View>
      <Text style={styles.reviewText}>{review.review_text}</Text>
      <Text style={styles.reviewDate}>{formatDistanceToNow(review.created_at)}</Text>
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShowingAllReviews, setIsShowingAllReviews] = useState(false);

  const fetchReviews = async (limit: number | null = null) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('venue_id', venue.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setReviews(data);
    } catch (err) {
      setError('Failed to fetch reviews');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews(isShowingAllReviews ? null : 3);
  }, [venue.id, isShowingAllReviews]);

  const handlePresentAddReview = () => addReviewSheetRef.current?.present();
  const handlePresentAddVibe = () => addVibeCheckSheetRef.current?.present();

  const handleReviewSubmitted = () => {
    addReviewSheetRef.current?.dismiss();
    fetchReviews(isShowingAllReviews ? null : 3);
    onDataNeedsRefresh();
  };

  const handleVibeSubmitted = () => {
    addVibeCheckSheetRef.current?.dismiss();
    onDataNeedsRefresh(); // This will refresh the whole dashboard, including the sheet
  };

  const renderReviewList = () => {
    if (isLoading) {
      return <ActivityIndicator size="large" color={colors.primary} />;
    }
    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }
    if (reviews.length === 0) {
      return <Text style={styles.noReviewsText}>No reviews yet. Be the first to add one!</Text>;
    }

    return (
      <FlatList
        data={reviews}
        renderItem={({ item }) => <ReviewItem review={item} />}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.reviewList}
      />
    );
  };

  const renderSummary = () => {
    return (
      <View style={styles.summaryContainer}>
        <View style={styles.header}>
          <Image
            style={styles.venueImage}
            source={{ uri: venue.image_url }}
            placeholder="venue-placeholder"
          />
          <View style={styles.headerContent}>
            <Text style={styles.venueName}>{venue.name}</Text>
            <StarRating rating={venue.average_rating} />
            <Text style={styles.venueAddress}>{venue.address}</Text>
          </View>
        </View>

        <View style={styles.separator} />

        <Text style={styles.sectionTitle}>Reviews</Text>
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
          <Ionicons name="map-outline" size={24} color={colors.muted} />
          <Text style={styles.infoText}>{venue.address}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="phone-outline" size={24} color={colors.muted} />
          <Text style={styles.infoText}>{venue.phone_number}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="link-outline" size={24} color={colors.muted} />
          <Text style={styles.infoText}>{venue.website}</Text>
        </View>
      </View>
    );
  };

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

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    venueImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginRight: 12,
    },
    headerContent: {
      flex: 1,
    },
    venueName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 4,
    },
    venueAddress: {
      fontSize: 14,
      color: colors.muted,
    },
    reviewItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
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
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
    },
    reviewText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 8,
    },
    reviewDate: {
      fontSize: 12,
      color: colors.muted,
    },
    addReviewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 12,
      marginTop: 12,
    },
    addReviewButtonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 8,
    },
    separator: {
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 16,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 12,
    },
    errorText: {
      color: colors.error,
      textAlign: 'center',
      padding: 20,
    },
    noReviewsText: {
      color: colors.muted,
      textAlign: 'center',
      padding: 20,
    },
    reviewList: {
      padding: 16,
    },
    summaryContainer: {
      padding: 16,
    },
  });

export default VenueDetailsSheet; 
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, useColorScheme, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import AddReviewSheet from '@/components/AddReviewSheet';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/src/lib/supabase';
import StarRating from '@/components/StarRating';
import RatingBreakdown from '@/components/RatingBreakdown';

const ReviewItem = ({ item }: { item: any }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = getStyles(colors);

  return (
    <View style={styles.reviewItem}>
      <Text style={styles.reviewAuthor}>{item.author_name || 'Anonymous'}</Text>
      <StarRating rating={item.rating} size={14} />
      <Text style={styles.reviewDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
    </View>
  );
};

export default function AllReviewsScreen() {
  const { venueId, venueName } = useLocalSearchParams<{ venueId: string, venueName: string }>();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [canLoadMore, setCanLoadMore] = useState(true);
  
  const [summary, setSummary] = useState({ breakdown: {}, count: 0 });

  const addReviewSheetRef = useRef<BottomSheetModal>(null);
  const addReviewSnapPoints = useMemo(() => ['70%'], []);
  const handlePresentAddReview = () => addReviewSheetRef.current?.present();

  const handleReviewSubmitted = () => {
    addReviewSheetRef.current?.dismiss();
    // Refetch everything to get the latest state
    fetchSummary();
    setPage(0);
    setCanLoadMore(true);
    fetchReviews(0);
  };

  const fetchSummary = useCallback(async () => {
    if (!venueId) return;
    const { data } = await supabase.rpc('get_venue_review_details', { p_venue_id: venueId });
    if (data) {
      setSummary({ breakdown: data[0].rating_breakdown, count: data[0].review_count });
    }
  }, [venueId]);

  const fetchReviews = useCallback(async (currentPage: number) => {
    if (!venueId || !canLoadMore) return;
    
    setLoading(true);
    
    const { data, error } = await supabase
      .from('reviews')
      .select('id, rating, comment, created_at, users(name)')
      .eq('venue_id', venueId)
      .order('created_at', { ascending: false })
      .range(currentPage * 20, (currentPage + 1) * 20 - 1);
      
    if (error) {
      console.error(error);
    } else if (data) {
      setReviews(prev => (currentPage === 0 ? data : [...prev, ...data]));
      if (data.length < 20) {
        setCanLoadMore(false);
      }
    }
    setLoading(false);
  }, [venueId, canLoadMore]);

  useEffect(() => {
    fetchSummary();
    fetchReviews(0);
  }, [fetchSummary, fetchReviews]);

  const handleLoadMore = () => {
    if (!loading && canLoadMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchReviews(nextPage);
    }
  };

  return (
    <BottomSheetModalProvider>
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <Stack.Screen
          options={{
            headerTitle: `Reviews for ${venueName}`,
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.text,
            headerLeft: () => (
              <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 10 }}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity onPress={handlePresentAddReview} style={{ paddingHorizontal: 10 }}>
                <Ionicons name="create-outline" size={24} color={colors.tint} />
              </TouchableOpacity>
            )
          }}
        />
        <FlatList
          data={reviews}
          renderItem={ReviewItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>Overall Ratings</Text>
              <RatingBreakdown breakdown={summary.breakdown} totalReviews={summary.count} />
            </View>
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loading ? <ActivityIndicator style={{ margin: 20 }} color={colors.tint} /> : null}
          contentContainerStyle={styles.listContent}
        />
        <BottomSheetModal
          ref={addReviewSheetRef}
          index={0}
          snapPoints={addReviewSnapPoints}
          backgroundStyle={{ backgroundColor: colors.surface }}
          handleIndicatorStyle={{ backgroundColor: colors.muted }}
        >
          <AddReviewSheet venueId={venueId!} onSubmitted={handleReviewSubmitted} />
        </BottomSheetModal>
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: colors.text, marginBottom: 8 },
  listContent: { paddingBottom: 20 },
  reviewItem: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewAuthor: { fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  reviewDate: { fontSize: 12, color: colors.muted, position: 'absolute', top: 20, right: 20 },
  reviewComment: { fontSize: 14, color: colors.text, lineHeight: 20, marginTop: 8 },
}); 
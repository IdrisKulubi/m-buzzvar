import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { supabase } from '@/src/lib/supabase';
import StarRating from '@/components/StarRating';

const ReviewItem = ({ review }: { review: any }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = useMemo(() => getStyles(colors), [colors]);

  return (
    <View style={styles.reviewItem}>
      <View style={styles.reviewHeader}>
        <Text style={styles.reviewAuthor}>{review.users?.name || 'Anonymous'}</Text>
        <StarRating rating={review.rating} size={14} color={colors.tint} />
      </View>
      <Text style={styles.reviewComment}>{review.comment}</Text>
      <Text style={styles.reviewDate}>
        {new Date(review.created_at).toLocaleDateString()}
      </Text>
    </View>
  );
};

export default function ReviewsScreen() {
  const { venueId, venueName } = useLocalSearchParams<{ venueId: string, venueName: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!venueId) return;

    const fetchReviews = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('*, users(name)')
        .eq('venue_id', venueId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("Failed to fetch all reviews:", error);
      } else {
        setReviews(data || []);
      }
      setLoading(false);
    };

    fetchReviews();
  }, [venueId]);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: `Reviews for ${venueName || 'Venue'}`,
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 10 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <ReviewItem review={item} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.centered}>
              <Text style={{ color: colors.muted }}>No reviews found for this venue.</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
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
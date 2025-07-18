import { supabase } from "@/src/lib/supabase";
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Image,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/src/lib/hooks";
import { useToast } from "@/src/lib/ToastProvider";
import { toggleBookmark, recordClubView, getVenues } from "@/src/actions/clubs";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import VenueDetailsSheet from "./VenueDetailsSheet";
import StarRating from "./StarRating";
import LiveIndicator from "./LiveIndicator";

const SwipeFeed: React.FC = () => {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const { showToast } = useToast();

  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Bottom sheet ref and snap points
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["75%", "90%"], []);

  const styles = useMemo(() => getStyles(colors), [colors]);

  const loadVenues = useCallback(async () => {
    let bookmarkedIds = new Set();

    if (user) {
      const { data: bookmarksData } = await supabase
        .from("user_bookmarks")
        .select("venue_id")
        .eq("user_id", user.id);
      if (bookmarksData) {
        bookmarkedIds = new Set(bookmarksData.map((b) => b.venue_id));
      }
    }

    // Use the updated getVenues function that includes vibe check data
    const { data: venuesData, error } = await getVenues();

    if (error) {
      console.error("Error fetching venues:", error);
      showToast({ type: "error", message: "Couldn't fetch venues" });
    } else {
      // Fetch additional data (menus, promotions) for each venue
      const venuesWithExtras = await Promise.all(
        venuesData.slice(0, 20).map(async (venue) => {
          const [menusResult, promotionsResult] = await Promise.all([
            supabase.from("menus").select("*").eq("venue_id", venue.id),
            supabase
              .from("promotions")
              .select("*")
              .eq("venue_id", venue.id)
              .eq("is_active", true),
          ]);

          return {
            ...venue,
            menus: menusResult.data || [],
            promotions: promotionsResult.data || [],
            isBookmarked: bookmarkedIds.has(venue.id),
            isLiked: false, // Placeholder for like state
          };
        })
      );

      setVenues(venuesWithExtras);

      // If a venue is open in the sheet, update its data as well
      if (selectedVenue) {
        const updatedSelected = venuesWithExtras.find(
          (v) => v.id === selectedVenue.id
        );
        if (updatedSelected) {
          setSelectedVenue(updatedSelected);
        }
      }
    }
  }, [user, showToast, selectedVenue]);

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true);
      await loadVenues();
      setLoading(false);
    };
    initialLoad();
  }, [user]);

  const handlePresentDetails = useCallback((venue: any) => {
    setSelectedVenue(venue);
    bottomSheetModalRef.current?.present();
  }, []);

  const handleInteraction = useCallback(
    (venueId: string, action: "like" | "save") => {
      if (!user) {
        showToast({
          type: "error",
          message: "You need to be logged in to do that!",
        });
        return;
      }

      const originalVenues = [...venues];
      let optimisticState, endpointCall, successMessage;

      if (action === "save") {
        const venue = venues.find((v) => v.id === venueId);
        const isCurrentlyBookmarked = venue?.isBookmarked;

        optimisticState = { isBookmarked: !isCurrentlyBookmarked };
        endpointCall = () => toggleBookmark(venueId, user.id);
        successMessage = isCurrentlyBookmarked
          ? "Removed from your faves"
          : "Saved to your faves ✨";
      } else {
        // like
        optimisticState = { isLiked: true };
        endpointCall = () => recordClubView(venueId, user.id, "like");
        successMessage = "You liked this spot! 🔥";
      }

      // Optimistic UI update
      setVenues((current) =>
        current.map((v) =>
          v.id === venueId ? { ...v, ...optimisticState } : v
        )
      );

      endpointCall().then(({ error }) => {
        if (error) {
          setVenues(originalVenues); // Revert on error
          showToast({
            type: "error",
            message: "Couldn't save that. Try again.",
          });
        } else {
          showToast({ type: "success", message: successMessage });
        }
      });
    },
    [user, venues, showToast]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadVenues();
    setRefreshing(false);
  }, [loadVenues]);

  const formatHours = (hours: string | null) => {
    if (!hours) return "Hours not available";

    try {
      const hoursObj = JSON.parse(hours);
      const today = new Date()
        .toLocaleString("en-us", { weekday: "long" })
        .toLowerCase();
      const todayHours = hoursObj[today];

      if (todayHours === "closed") return "Closed Today";
      if (todayHours) return `Open: ${todayHours}`;

      return "Hours not specified";
    } catch (e) {
      return hours;
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image
        source={{ uri: item.cover_image_url || "https://placehold.co/600x400" }}
        style={styles.cardImage}
      />

      {item.promotions.length > 0 && (
        <View style={styles.promotionBadge}>
          <Ionicons name="star" size={14} color={colors.background} />
          <Text style={styles.promotionText}>{item.promotions[0].title}</Text>
        </View>
      )}

      {/* Live indicator positioned in top right */}
      {(item.has_live_activity || item.recent_vibe_count > 0) && (
        <View style={styles.liveIndicatorContainer}>
          <LiveIndicator
            hasLiveActivity={item.has_live_activity}
            averageBusyness={item.average_recent_busyness}
            recentVibeCount={item.recent_vibe_count}
            size="medium"
          />
        </View>
      )}

      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.name}</Text>
        <View style={styles.ratingContainer}>
          <StarRating rating={item.average_rating || 0} size={18} />
          <Text style={styles.ratingText}>
            {(item.average_rating || 0).toFixed(1)} ({item.review_count || 0}{" "}
            reviews)
          </Text>
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.detailsRow}>
          <Ionicons name="location-outline" size={16} color={colors.muted} />
          <Text style={styles.detailsText} numberOfLines={1}>
            {item.address}
          </Text>
        </View>

        <View style={styles.detailsRow}>
          <Feather name="clock" size={16} color={colors.muted} />
          <Text style={styles.detailsText}>{formatHours(item.hours)}</Text>
        </View>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleInteraction(item.id, "like")}
        >
          <Ionicons
            name={item.isLiked ? "heart" : "heart-outline"}
            size={22}
            color={item.isLiked ? colors.destructive : colors.text}
          />
          <Text
            style={[
              styles.actionText,
              item.isLiked && { color: colors.destructive },
            ]}
          >
            Like
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleInteraction(item.id, "save")}
        >
          <Ionicons
            name={item.isBookmarked ? "bookmark" : "bookmark-outline"}
            size={22}
            color={item.isBookmarked ? colors.tint : colors.text}
          />
          <Text
            style={[
              styles.actionText,
              item.isBookmarked && { color: colors.tint },
            ]}
          >
            Save
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handlePresentDetails(item)}
        >
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
    <>
      <FlatList
        data={venues}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={{
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        }}
        handleIndicatorStyle={{ backgroundColor: colors.muted }}
      >
        {selectedVenue && (
          <VenueDetailsSheet
            venue={selectedVenue}
            onDataNeedsRefresh={loadVenues}
          />
        )}
      </BottomSheetModal>
    </>
  );
};

const getStyles = (colors: typeof Colors.dark) =>
  StyleSheet.create({
    listContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 100,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    cardImage: {
      width: "100%",
      height: 200,
      backgroundColor: colors.border,
    },
    promotionBadge: {
      position: "absolute",
      top: 12,
      left: 12,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.tint,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 20,
      gap: 6,
    },
    promotionText: {
      color: colors.background,
      fontWeight: "bold",
      fontSize: 12,
    },
    liveIndicatorContainer: {
      position: "absolute",
      top: 12,
      right: 12,
      zIndex: 1,
    },
    cardContent: {
      padding: 16,
    },
    cardTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
    },
    ratingContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    ratingText: {
      fontSize: 14,
      color: colors.muted,
    },
    cardDescription: {
      fontSize: 14,
      color: colors.muted,
      lineHeight: 20,
      marginBottom: 12,
    },
    detailsRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    detailsText: {
      fontSize: 14,
      color: colors.text,
      marginLeft: 10,
      flexShrink: 1,
    },
    cardActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 8,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 8,
      gap: 8,
    },
    actionText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: "500",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      color: colors.text,
      marginTop: 10,
    },
  });

export default SwipeFeed;

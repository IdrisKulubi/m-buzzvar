import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  useColorScheme,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import VibeCheckCard from "./VibeCheckCard";
import BusynessIndicator from "./BusynessIndicator";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import {
  Venue,
  VibeCheckWithDetails,
  LocationVerification,
} from "@/src/lib/types";
import { VibeCheckService } from "@/src/services/VibeCheckService";
import { LocationVerificationService } from "@/src/services/LocationVerificationService";

interface VenueVibeSectionProps {
  venue: Venue;
  onPostVibeCheck: () => void;
  onVibeCheckPress?: (vibeCheck: VibeCheckWithDetails) => void;
}

const VenueVibeSection: React.FC<VenueVibeSectionProps> = ({
  venue,
  onPostVibeCheck,
  onVibeCheckPress,
}) => {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [vibeChecks, setVibeChecks] = useState<VibeCheckWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canPostVibeCheck, setCanPostVibeCheck] = useState(false);
  const [locationVerification, setLocationVerification] =
    useState<LocationVerification | null>(null);
  const [averageBusyness, setAverageBusyness] = useState<number | null>(null);

  // Load vibe checks for the venue
  const loadVibeChecks = useCallback(
    async (showRefreshing = false) => {
      try {
        if (showRefreshing) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const { data, error } = await VibeCheckService.getVenueVibeChecks(
          venue.id,
          4 // Last 4 hours
        );

        if (error) {
          // Handle different types of errors more gracefully
          if (error.type === "NETWORK_OFFLINE") {
            // Don't show alert for network issues, just log and continue with empty state
            console.warn("Network offline, showing empty vibe checks state");
            setVibeChecks([]);
            setAverageBusyness(null);
          } else {
            // Only show alerts for non-network errors
            console.error("Error loading vibe checks:", error);
            // Only show alert if it's not a refresh (to avoid interrupting user)
            if (!showRefreshing) {
              Alert.alert(
                "Error",
                "Failed to load vibe checks. Please try again."
              );
            }
          }
          return;
        }

        setVibeChecks(data);

        // Calculate average busyness
        if (data.length > 0) {
          const average =
            data.reduce((sum, vc) => sum + vc.busyness_rating, 0) / data.length;
          setAverageBusyness(Math.round(average * 10) / 10); // Round to 1 decimal
        } else {
          setAverageBusyness(null);
        }
      } catch (error) {
        console.error("Error loading vibe checks:", error);
        // Only show alert if it's not a refresh
        if (!showRefreshing) {
          Alert.alert("Error", "Failed to load vibe checks. Please try again.");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [venue.id]
  );

  // Check if user can post vibe check (location verification)
  const checkLocationPermission = useCallback(async () => {
    try {
      const result = await LocationVerificationService.verifyLocationForVenue(
        venue
      );

      if (result.error) {
        setCanPostVibeCheck(false);
        setLocationVerification(null);
        return;
      }

      if (result.verification) {
        setLocationVerification(result.verification);
        setCanPostVibeCheck(result.verification.is_valid);
      }
    } catch (error) {
      console.error("Error checking location:", error);
      setCanPostVibeCheck(false);
      setLocationVerification(null);
    }
  }, [venue]);

  useEffect(() => {
    loadVibeChecks();
    checkLocationPermission();
  }, [loadVibeChecks, checkLocationPermission]);

  const handleRefresh = useCallback(() => {
    loadVibeChecks(true);
    checkLocationPermission();
  }, [loadVibeChecks, checkLocationPermission]);

  const handlePostVibeCheck = () => {
    if (!canPostVibeCheck && locationVerification) {
      const distanceText = LocationVerificationService.getDistanceDescription(
        locationVerification.distance_meters
      );
      Alert.alert(
        "Too Far Away",
        `You need to be within 100m of ${venue.name} to post a vibe check. You are currently ${distanceText}.`,
        [{ text: "OK" }]
      );
      return;
    }

    onPostVibeCheck();
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        <ThemedText type="subtitle" style={styles.title}>
          Live Vibe
        </ThemedText>
        {averageBusyness && (
          <View style={styles.averageContainer}>
            <ThemedText style={styles.averageLabel}>Avg:</ThemedText>
            <BusynessIndicator
              rating={Math.round(averageBusyness) as 1 | 2 | 3 | 4 | 5}
              size="small"
              showLabel={false}
            />
            <ThemedText style={styles.averageValue}>
              {averageBusyness.toFixed(1)}
            </ThemedText>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.postButton,
          canPostVibeCheck
            ? { 
                backgroundColor: colors.tint,
                shadowColor: colors.tint,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }
            : {
                backgroundColor: `${colors.muted}20`,
                borderWidth: 1,
                borderColor: `${colors.muted}40`,
              },
        ]}
        onPress={handlePostVibeCheck}
        disabled={!canPostVibeCheck}
      >
        {canPostVibeCheck ? (
          <>
            <Ionicons name="add-circle" size={20} color={colors.background} />
            <ThemedText
              style={[styles.postButtonText, { color: colors.background }]}
            >
              Post Vibe Check
            </ThemedText>
          </>
        ) : (
          <>
            <ThemedText style={styles.tooFarEmoji}>😔</ThemedText>
            <ThemedText
              style={[styles.postButtonText, { color: colors.muted }]}
            >
              You&apos;re too far away
            </ThemedText>
          </>
        )}
      </TouchableOpacity>

      {locationVerification && !canPostVibeCheck && (
        <View style={styles.distanceCard}>
          <View style={styles.distanceHeader}>
            <View style={styles.distanceIconContainer}>
              <Ionicons
                name="location"
                size={18}
                color={colors.muted}
              />
            </View>
            <View style={styles.distanceInfo}>
              <ThemedText style={styles.distanceTitle}>
                You are {Math.round(locationVerification.distance_meters)}m from venue
              </ThemedText>
              <ThemedText style={styles.distanceSubtitle}>
                Maximum distance is 100m to post vibe checks
              </ThemedText>
            </View>
          </View>
          <View style={styles.distanceProgressContainer}>
            <View style={styles.distanceProgressBar}>
              <View 
                style={[
                  styles.distanceProgressFill,
                  { 
                    width: `${Math.min((100 / locationVerification.distance_meters) * 100, 100)}%`,
                    backgroundColor: locationVerification.distance_meters > 100 ? colors.destructive : colors.tint
                  }
                ]} 
              />
            </View>
            <ThemedText style={styles.distanceProgressText}>
              {locationVerification.distance_meters > 100 ? 'Too far' : 'Close enough'}
            </ThemedText>
          </View>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <ThemedText style={styles.emptyEmoji}>🎉</ThemedText>
        <Ionicons
          name="chatbubble-outline"
          size={32}
          color={colors.muted}
          style={styles.emptyIcon}
        />
      </View>
      <ThemedText style={styles.emptyTitle}>No Recent Vibe Checks</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Be the first to share what&apos;s happening at {venue.name}!
      </ThemedText>
      <ThemedText style={styles.emptyHint}>
        Post a vibe check when you&apos;re within 100m of the venue
      </ThemedText>
    </View>
  );

  const renderVibeChecks = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>
            Loading vibe checks...
          </ThemedText>
        </View>
      );
    }

    if (vibeChecks.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.vibeChecksList}>
        {vibeChecks.map((vibeCheck) => (
          <VibeCheckCard
            key={vibeCheck.id}
            vibeCheck={vibeCheck}
            showVenue={false}
            onVenuePress={
              onVibeCheckPress ? () => onVibeCheckPress(vibeCheck) : undefined
            }
          />
        ))}
      </View>
    );
  };

  const styles = getStyles(colors);

  return (
    <ThemedView style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderVibeChecks()}
      </ScrollView>
    </ThemedView>
  );
};

const getStyles = (colors: typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    titleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    title: {
      color: colors.text,
    },
    averageContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
    },
    averageLabel: {
      fontSize: 12,
      color: colors.muted,
      marginRight: 6,
    },
    averageValue: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.text,
      marginLeft: 6,
    },
    postButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      marginBottom: 8,
    },
    postButtonText: {
      fontSize: 16,
      fontWeight: "600",
      marginLeft: 8,
    },
    tooFarEmoji: {
      fontSize: 20,
      marginRight: 6,
    },
    distanceCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginTop: 8,
      borderWidth: 1,
      borderColor: colors.border,
    },
    distanceHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: 12,
    },
    distanceIconContainer: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: `${colors.muted}20`,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
    },
    distanceInfo: {
      flex: 1,
    },
    distanceTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.text,
      marginBottom: 2,
    },
    distanceSubtitle: {
      fontSize: 12,
      color: colors.muted,
      lineHeight: 16,
    },
    distanceProgressContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    distanceProgressBar: {
      flex: 1,
      height: 6,
      backgroundColor: `${colors.muted}30`,
      borderRadius: 3,
      overflow: "hidden",
    },
    distanceProgressFill: {
      height: "100%",
      borderRadius: 3,
    },
    distanceProgressText: {
      fontSize: 11,
      fontWeight: "500",
      color: colors.muted,
      minWidth: 60,
      textAlign: "right",
    },
    scrollView: {
      flex: 1,
    },
    loadingContainer: {
      padding: 32,
      alignItems: "center",
    },
    loadingText: {
      color: colors.muted,
    },
    emptyState: {
      padding: 32,
      alignItems: "center",
    },
    emptyIconContainer: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 16,
    },
    emptyEmoji: {
      fontSize: 32,
      position: "absolute",
      top: -8,
      right: -8,
      zIndex: 1,
    },
    emptyIcon: {
      opacity: 0.6,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 8,
      textAlign: "center",
      color: colors.text,
    },
    emptyDescription: {
      fontSize: 14,
      color: colors.muted,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 8,
    },
    emptyHint: {
      fontSize: 12,
      color: colors.muted,
      textAlign: "center",
      fontStyle: "italic",
      opacity: 0.8,
    },
    vibeChecksList: {
      paddingBottom: 16,
    },
  });

export default VenueVibeSection;

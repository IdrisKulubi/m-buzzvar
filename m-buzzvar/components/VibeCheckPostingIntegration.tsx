/**
 * Complete Vibe Check Posting Integration Component
 * Demonstrates the full end-to-end flow with all validation, error handling, and success feedback
 */

import React, { useState, useCallback } from "react";
import { View, StyleSheet, Alert, Modal, TouchableOpacity } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import VibeCheckPostingFlow from "./VibeCheckPostingFlow";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { Venue, VibeCheckWithDetails } from "@/src/lib/types";
import { VibeCheckService } from "@/src/services/VibeCheckService";
import { VibeCheckRealtimeService } from "@/src/services/VibeCheckRealtimeService";
import { useAuth } from "@/src/lib/hooks";

interface VibeCheckPostingIntegrationProps {
  venue: Venue;
  onVibeCheckPosted?: (vibeCheck: VibeCheckWithDetails) => void;
  onClose?: () => void;
  visible: boolean;
}

interface IntegrationState {
  isModalVisible: boolean;
  isLoading: boolean;
  lastPostedVibeCheck?: VibeCheckWithDetails;
  error?: string;
}

const VibeCheckPostingIntegration: React.FC<
  VibeCheckPostingIntegrationProps
> = ({ venue, onVibeCheckPosted, onClose, visible }) => {
  const { user } = useAuth();
  const [state, setState] = useState<IntegrationState>({
    isModalVisible: visible,
    isLoading: false,
  });

  // Update modal visibility when prop changes
  React.useEffect(() => {
    setState((prev) => ({ ...prev, isModalVisible: visible }));
  }, [visible]);

  // Set up real-time subscription for immediate feedback
  React.useEffect(() => {
    if (!visible || !venue.id) return;

    const subscriptionId = `posting-integration-${venue.id}`;

    VibeCheckRealtimeService.subscribeToVenue(subscriptionId, venue.id, {
      onVibeCheckInsert: (vibeCheck: VibeCheckWithDetails) => {
        // Only handle vibe checks from the current user
        if (user && vibeCheck.user_id === user.id) {
          setState((prev) => ({
            ...prev,
            lastPostedVibeCheck: vibeCheck,
          }));

          // Notify parent component
          onVibeCheckPosted?.(vibeCheck);
        }
      },
      onError: (error: any) => {
        console.error("Real-time subscription error:", error);
        setState((prev) => ({
          ...prev,
          error: "Failed to set up real-time updates",
        }));
      },
    });

    return () => {
      VibeCheckRealtimeService.unsubscribe(subscriptionId);
    };
  }, [visible, venue.id, user, onVibeCheckPosted]);

  const handleSuccess = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      // Fetch the latest vibe checks to get the newly posted one
      const result = await VibeCheckService.getVenueVibeChecks(venue.id, 1);

      if (result.data && result.data.length > 0) {
        const latestVibeCheck = result.data[0];

        // Verify it's from the current user and recent (within last minute)
        if (user && latestVibeCheck.user_id === user.id) {
          const createdAt = new Date(latestVibeCheck.created_at);
          const now = new Date();
          const diffInMinutes =
            (now.getTime() - createdAt.getTime()) / (1000 * 60);

          if (diffInMinutes < 1) {
            setState((prev) => ({
              ...prev,
              lastPostedVibeCheck: latestVibeCheck,
              isLoading: false,
            }));

            // Show success feedback
            showSuccessAlert(latestVibeCheck);
            return;
          }
        }
      }

      // Fallback success message if we can't fetch the specific vibe check
      showGenericSuccessAlert();
    } catch (error) {
      console.error("Error fetching posted vibe check:", error);
      showGenericSuccessAlert();
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [venue.id, user]);

  const showSuccessAlert = (vibeCheck: VibeCheckWithDetails) => {
    Alert.alert(
      "🎉 Vibe Check Posted!",
      `Your ${getBusynessLabel(
        vibeCheck.rating || vibeCheck.rating
      )} rating for ${venue.name} has been shared with the community.${
        vibeCheck.comment ? `\n\n"${vibeCheck.comment}"` : ""
      }`,
      [
        {
          text: "View Live Feed",
          onPress: () => {
            handleClose();
            // Navigate to live feed - this would be handled by parent component
          },
        },
        {
          text: "Stay Here",
          style: "cancel",
          onPress: handleClose,
        },
      ]
    );
  };

  const showGenericSuccessAlert = () => {
    Alert.alert(
      "🎉 Vibe Check Posted!",
      `Your vibe check for ${venue.name} has been shared with the community.`,
      [
        {
          text: "Great!",
          onPress: handleClose,
        },
      ]
    );
  };

  const getBusynessLabel = (rating: number): string => {
    const labels = {
      1: "Dead",
      2: "Quiet",
      3: "Moderate",
      4: "Busy",
      5: "Packed",
    };
    return labels[rating as keyof typeof labels] || "Unknown";
  };

  const handleClose = useCallback(() => {
    setState((prev) => ({ ...prev, isModalVisible: false }));
    onClose?.();
  }, [onClose]);

  const handleCancel = useCallback(() => {
    // Show confirmation if user has started filling out the form
    Alert.alert(
      "Cancel Vibe Check?",
      "Are you sure you want to cancel posting your vibe check?",
      [
        {
          text: "Keep Editing",
          style: "cancel",
        },
        {
          text: "Cancel",
          style: "destructive",
          onPress: handleClose,
        },
      ]
    );
  }, [handleClose]);

  const handleError = useCallback(
    (error: any) => {
      console.error("Vibe check posting error:", error);

      setState((prev) => ({
        ...prev,
        error: error?.message || "Failed to post vibe check",
      }));

      // Show error alert with retry option
      Alert.alert(
        "Failed to Post Vibe Check",
        error?.message || "Something went wrong. Please try again.",
        [
          {
            text: "Try Again",
            onPress: () => {
              setState((prev) => ({ ...prev, error: undefined }));
            },
          },
          {
            text: "Cancel",
            style: "cancel",
            onPress: handleClose,
          },
        ]
      );
    },
    [handleClose]
  );

  if (!user) {
    return (
      <Modal
        visible={state.isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleClose}
      >
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={Colors.light.text} />
            </TouchableOpacity>
            <ThemedText type="title">Sign In Required</ThemedText>
          </View>

          <View style={styles.centerContent}>
            <Ionicons
              name="person-outline"
              size={64}
              color={Colors.light.muted}
            />
            <ThemedText style={styles.signInMessage}>
              Please sign in to post vibe checks
            </ThemedText>
          </View>
        </ThemedView>
      </Modal>
    );
  }

  return (
    <Modal
      visible={state.isModalVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <ThemedView style={styles.container}>
        <VibeCheckPostingFlow
          venue={venue}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          userId={user.id}
        />

        {/* Success Overlay */}
        {state.lastPostedVibeCheck && (
          <View style={styles.successOverlay}>
            <View style={styles.successContainer}>
              <Ionicons
                name="checkmark-circle"
                size={64}
                color={Colors.semantic.success}
              />
              <ThemedText style={styles.successTitle}>
                Vibe Check Posted!
              </ThemedText>
              <ThemedText style={styles.successMessage}>
                Your{" "}
                {getBusynessLabel(
                  state.lastPostedVibeCheck.rating ||
                    state.lastPostedVibeCheck.rating
                )}{" "}
                rating has been shared with the community.
              </ThemedText>
              {state.lastPostedVibeCheck.comment && (
                <ThemedText style={styles.successComment}>
                  &quot;{state.lastPostedVibeCheck.comment}&quot;
                </ThemedText>
              )}
            </View>
          </View>
        )}

        {/* Error Display */}
        {state.error && (
          <View style={styles.errorOverlay}>
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle"
                size={48}
                color={Colors.semantic.error}
              />
              <ThemedText style={styles.errorTitle}>Posting Failed</ThemedText>
              <ThemedText style={styles.errorMessage}>{state.error}</ThemedText>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() =>
                  setState((prev) => ({ ...prev, error: undefined }))
                }
              >
                <ThemedText style={styles.retryButtonText}>
                  Try Again
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ThemedView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    left: 16,
    padding: 8,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  signInMessage: {
    marginTop: 16,
    fontSize: 18,
    textAlign: "center",
    color: Colors.light.muted,
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  successContainer: {
    backgroundColor: Colors.light.background,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 300,
    margin: 20,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.semantic.success,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 12,
  },
  successComment: {
    fontSize: 14,
    fontStyle: "italic",
    color: Colors.light.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  errorOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    backgroundColor: Colors.light.background,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    maxWidth: 300,
    margin: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.semantic.error,
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorMessage: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.light.background,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VibeCheckPostingIntegration;

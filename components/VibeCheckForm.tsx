import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import StarRating from "./StarRating";
import { Colors } from "@/constants/Colors";
import {
  Venue,
  VibeCheckFormData,
  BUSYNESS_LABELS,
  BusynessRating,
} from "@/src/lib/types";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { PhotoUploadProgress } from "@/src/services/PhotoUploadService";
import { AppError } from "@/src/lib/errors";
import ErrorDisplay from "./ErrorDisplay";
import { RateLimitCountdown } from "./CountdownTimer";
import {
  VibeCheckValidator,
  ValidationResult,
} from "@/src/lib/vibeCheckValidation";

interface VibeCheckFormProps {
  venue: Venue;
  onSubmit: (data: VibeCheckFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  locationVerified?: boolean;
  distanceToVenue?: number;
  error?: AppError | null;
  onRetry?: () => void;
  rateLimitInfo?: {
    canPost: boolean;
    timeUntilReset?: number;
  };
}

const VibeCheckForm: React.FC<VibeCheckFormProps> = ({
  venue,
  onSubmit,
  onCancel,
  isSubmitting,
  locationVerified = false,
  distanceToVenue,
  error,
  onRetry,
  rateLimitInfo,
}) => {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];

  const [busynessRating, setBusynessRating] = useState<BusynessRating>(3);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [uploadProgress, setUploadProgress] =
    useState<PhotoUploadProgress | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [localError, setLocalError] = useState<AppError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult>({
    isValid: true,
    errors: [],
  });

  // Validate form data whenever inputs change
  useEffect(() => {
    const formData: VibeCheckFormData = {
      venue_id: venue.id,
      busyness_rating: busynessRating,
      comment: comment.trim() || undefined,
      photo: photo || undefined,
    };

    const locationVerification = locationVerified
      ? {
          is_valid: true,
          distance_meters: distanceToVenue || 0,
          venue_name: venue.name,
        }
      : undefined;

    const validation = VibeCheckValidator.validateVibeCheckForm(
      formData,
      locationVerification
    );
    setValidationResult(validation);
  }, [
    venue.id,
    venue.name,
    busynessRating,
    comment,
    photo,
    locationVerified,
    distanceToVenue,
  ]);

  const handleSubmit = async () => {
    // Clear any previous local errors
    setLocalError(null);

    // Comprehensive validation before submission
    const formData: VibeCheckFormData = {
      venue_id: venue.id,
      busyness_rating: busynessRating,
      comment: comment.trim() || undefined,
      photo: photo || undefined,
    };

    const locationVerification = locationVerified
      ? {
          is_valid: true,
          distance_meters: distanceToVenue || 0,
          venue_name: venue.name,
        }
      : {
          is_valid: false,
          distance_meters: distanceToVenue || Infinity,
          venue_name: venue.name,
        };

    // Validate all form data
    const validation = VibeCheckValidator.validateVibeCheckForm(
      formData,
      locationVerification
    );

    if (!validation.isValid) {
      const validationSummary =
        VibeCheckValidator.getValidationSummary(validation);
      Alert.alert(
        "Please Fix the Following Issues",
        validationSummary.allMessages.join("\n"),
        [{ text: "OK" }]
      );
      return;
    }

    // Check rate limiting
    if (rateLimitInfo && !rateLimitInfo.canPost) {
      return; // Rate limit countdown should be visible
    }

    // Additional location check with user-friendly message
    if (!locationVerified) {
      Alert.alert(
        "Location Required",
        "You must be within 100 meters of the venue to post a vibe check.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      // Let parent component handle the error through props
      console.error("Form submission error:", error);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setLocalError(null);

    try {
      if (onRetry) {
        await onRetry();
      }
    } catch (error) {
      console.error("Retry failed:", error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDismissError = () => {
    setLocalError(null);
  };

  const handlePhotoSelect = async () => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Permission to access camera roll is required to add photos.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          type: "image/jpeg",
          name: `vibe_check_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to select photo. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Request permission
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (permissionResult.granted === false) {
        Alert.alert(
          "Permission Required",
          "Permission to access camera is required to take photos.",
          [{ text: "OK" }]
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPhoto({
          uri: asset.uri,
          type: "image/jpeg",
          name: `vibe_check_${Date.now()}.jpg`,
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to take photo. Please try again.", [
        { text: "OK" },
      ]);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert("Add Photo", "Choose how you want to add a photo", [
      { text: "Camera", onPress: handleCameraCapture },
      { text: "Photo Library", onPress: handlePhotoSelect },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removePhoto = () => {
    setPhoto(null);
  };

  const getLocationStatus = () => {
    if (locationVerified) {
      return {
        icon: "checkmark-circle" as const,
        color: Colors.semantic.success,
        text: "Location verified",
      };
    } else if (distanceToVenue !== undefined) {
      return {
        icon: "warning" as const,
        color: Colors.semantic.warning,
        text: `${Math.round(distanceToVenue)}m from venue (max 100m)`,
      };
    } else {
      return {
        icon: "location-outline" as const,
        color: colors.muted,
        text: "Verifying location...",
      };
    }
  };

  const locationStatus = getLocationStatus();
  const isFormValid =
    validationResult.isValid &&
    locationVerified &&
    (rateLimitInfo ? rateLimitInfo.canPost : true);

  const styles = getStyles(colors);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Post Vibe Check
          </ThemedText>
          <ThemedText style={styles.venueText}>at {venue.name}</ThemedText>
        </View>

        {/* Location Status */}
        {!locationVerified && distanceToVenue !== undefined ? (
          <View style={styles.distanceCard}>
            <View style={styles.distanceHeader}>
              <View style={styles.distanceIconContainer}>
                <Ionicons name="location" size={18} color={colors.muted} />
              </View>
              <View style={styles.distanceInfo}>
                <ThemedText style={styles.distanceTitle}>
                  You are {Math.round(distanceToVenue)}m from venue
                </ThemedText>
                <ThemedText style={styles.distanceSubtitle}>
                  You need to be within 100m to post vibe checks
                </ThemedText>
              </View>
            </View>
            <View style={styles.distanceProgressContainer}>
              <View style={styles.distanceProgressBar}>
                <View
                  style={[
                    styles.distanceProgressFill,
                    {
                      width: `${Math.min((100 / distanceToVenue) * 100, 100)}%`,
                      backgroundColor:
                        distanceToVenue > 100
                          ? colors.destructive
                          : colors.tint,
                    },
                  ]}
                />
              </View>
              <ThemedText style={styles.distanceProgressText}>
                {distanceToVenue > 100 ? "Too far" : "Close enough"}
              </ThemedText>
            </View>
          </View>
        ) : (
          <View style={styles.locationStatus}>
            <Ionicons
              name={locationStatus.icon}
              size={20}
              color={locationStatus.color}
            />
            <ThemedText
              style={[styles.locationText, { color: locationStatus.color }]}
            >
              {locationStatus.text}
            </ThemedText>
          </View>
        )}

        {/* Error Display */}
        {(error || localError) && (
          <ErrorDisplay
            error={error || localError!}
            onRetry={error?.retryable ? handleRetry : undefined}
            onDismiss={handleDismissError}
            isRetrying={isRetrying}
          />
        )}

        {/* Rate Limiting Countdown */}
        {rateLimitInfo &&
          !rateLimitInfo.canPost &&
          rateLimitInfo.timeUntilReset && (
            <RateLimitCountdown
              venueId={venue.id}
              timeUntilReset={rateLimitInfo.timeUntilReset}
              onComplete={() => {
                // Parent component should refresh rate limit info
              }}
            />
          )}

        {/* Busyness Rating */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            How busy is it? *
          </ThemedText>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={busynessRating}
              size={32}
              color={colors.tint}
              onRate={(rating) => setBusynessRating(rating as BusynessRating)}
            />
            <ThemedText style={styles.ratingLabel}>
              {BUSYNESS_LABELS[busynessRating]}
            </ThemedText>
          </View>
        </View>

        {/* Comment */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            What&apos;s the vibe? (optional)
          </ThemedText>
          <TextInput
            style={[
              styles.commentInput,
              comment.length > 280 && styles.commentInputError,
            ]}
            placeholder="Share what's happening right now..."
            placeholderTextColor={colors.muted}
            value={comment}
            onChangeText={setComment}
            maxLength={280}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <View style={styles.commentFooter}>
            <ThemedText
              style={[
                styles.characterCount,
                comment.length > 280 && styles.characterCountError,
              ]}
            >
              {comment.length}/280
            </ThemedText>
            {comment.length > 280 && (
              <ThemedText style={styles.validationError}>
                Comment is too long
              </ThemedText>
            )}
          </View>
        </View>

        {/* Photo */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Add a photo (optional)
          </ThemedText>

          {photo ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              {!isUploadingPhoto && (
                <TouchableOpacity
                  style={styles.removePhotoButton}
                  onPress={removePhoto}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={Colors.semantic.error}
                  />
                </TouchableOpacity>
              )}

              {/* Upload Progress Overlay */}
              {uploadProgress && (
                <View style={styles.uploadProgressOverlay}>
                  <View style={styles.uploadProgressContainer}>
                    <ActivityIndicator size="small" color={colors.background} />
                    <ThemedText style={styles.uploadProgressText}>
                      Uploading... {Math.round(uploadProgress.percentage)}%
                    </ThemedText>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${uploadProgress.percentage}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <TouchableOpacity
              style={[
                styles.addPhotoButton,
                isUploadingPhoto && styles.addPhotoButtonDisabled,
              ]}
              onPress={showPhotoOptions}
              disabled={isUploadingPhoto}
            >
              {isUploadingPhoto ? (
                <>
                  <ActivityIndicator size="small" color={colors.tint} />
                  <ThemedText style={styles.addPhotoText}>
                    Processing...
                  </ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={24} color={colors.tint} />
                  <ThemedText style={styles.addPhotoText}>Add Photo</ThemedText>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={isSubmitting}
        >
          <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.submitButton,
            !locationVerified && !isSubmitting && styles.submitButtonFar,
            (isSubmitting || (rateLimitInfo && !rateLimitInfo.canPost)) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={isSubmitting || (rateLimitInfo && !rateLimitInfo.canPost)}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.background} />
          ) : !locationVerified ? (
            <View style={styles.submitButtonContent}>
              <ThemedText style={styles.submitButtonEmoji}>😢</ThemedText>
              <ThemedText style={styles.submitButtonFarText}>
                You are far from the venue
              </ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.submitButtonText}>
              Post Vibe Check
            </ThemedText>
          )}
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
};

const getStyles = (colors: typeof Colors.dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      marginBottom: 4,
    },
    venueText: {
      fontSize: 16,
      color: colors.muted,
    },
    locationStatus: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.surface,
      padding: 12,
      borderRadius: 8,
      marginBottom: 24,
    },
    locationText: {
      marginLeft: 8,
      fontSize: 14,
      fontWeight: "500",
    },
    distanceCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
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
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      marginBottom: 12,
      fontSize: 16,
      color: colors.text,
    },
    ratingContainer: {
      alignItems: "center",
      padding: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
    },
    ratingLabel: {
      marginTop: 8,
      fontSize: 18,
      fontWeight: "600",
      color: colors.tint,
    },
    commentInput: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      borderWidth: 1,
      borderColor: colors.border,
    },
    characterCount: {
      textAlign: "right",
      marginTop: 4,
      fontSize: 12,
      color: colors.muted,
    },
    photoContainer: {
      position: "relative",
    },
    photoPreview: {
      width: "100%",
      height: 200,
      borderRadius: 12,
    },
    removePhotoButton: {
      position: "absolute",
      top: 8,
      right: 8,
      backgroundColor: colors.background,
      borderRadius: 12,
    },
    addPhotoButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 20,
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: "dashed",
    },
    addPhotoText: {
      marginLeft: 8,
      fontSize: 16,
      color: colors.tint,
      fontWeight: "500",
    },
    addPhotoButtonDisabled: {
      opacity: 0.6,
    },
    uploadProgressOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    uploadProgressContainer: {
      alignItems: "center",
      padding: 20,
    },
    uploadProgressText: {
      color: colors.background,
      fontSize: 14,
      fontWeight: "500",
      marginTop: 8,
      marginBottom: 12,
    },
    progressBar: {
      width: 120,
      height: 4,
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      borderRadius: 2,
      overflow: "hidden",
    },
    progressBarFill: {
      height: "100%",
      backgroundColor: colors.background,
      borderRadius: 2,
    },
    actionButtons: {
      flexDirection: "row",
      padding: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 12,
    },
    cancelButton: {
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      minWidth: 70,
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: "600",
      paddingTop:"auto",
      color: colors.text,
    },
    submitButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 18,
      borderRadius: 20,
      backgroundColor: colors.tint,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    submitButtonDisabled: {
      backgroundColor: colors.muted,
    },
    submitButtonFar: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    submitButtonContent: {
      alignItems: "center",
      justifyContent: "center",
    },
    submitButtonEmoji: {
      fontSize: 18,
      marginBottom: 2,
    },
    submitButtonFarText: {
      fontSize: 13,
      fontWeight: "600",
      color: colors.muted,
      textAlign: "center",
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.background,
    },
    commentInputError: {
      borderColor: Colors.semantic.error,
      borderWidth: 2,
    },
    commentFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    characterCountError: {
      color: Colors.semantic.error,
      fontWeight: "600",
    },
    validationError: {
      fontSize: 12,
      color: Colors.semantic.error,
      fontWeight: "500",
    },
  });

export default VibeCheckForm;

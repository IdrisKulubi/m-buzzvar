import React, { useState } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  ActivityIndicator,
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

interface VibeCheckFormProps {
  venue: Venue;
  onSubmit: (data: VibeCheckFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  locationVerified?: boolean;
  distanceToVenue?: number;
}

const VibeCheckForm: React.FC<VibeCheckFormProps> = ({
  venue,
  onSubmit,
  onCancel,
  isSubmitting,
  locationVerified = false,
  distanceToVenue,
}) => {
  const [busynessRating, setBusynessRating] = useState<BusynessRating>(3);
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<{
    uri: string;
    type: string;
    name: string;
  } | null>(null);
  const [uploadProgress, setUploadProgress] =
    useState<PhotoUploadProgress | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleSubmit = async () => {
    if (!locationVerified) {
      Alert.alert(
        "Location Required",
        "You must be within 100 meters of the venue to post a vibe check.",
        [{ text: "OK" }]
      );
      return;
    }

    const formData: VibeCheckFormData = {
      venue_id: venue.id,
      busyness_rating: busynessRating,
      comment: comment.trim() || undefined,
      photo: photo || undefined,
    };

    try {
      await onSubmit(formData);
    } catch (error) {
      Alert.alert("Error", "Failed to post vibe check. Please try again.", [
        { text: "OK" },
      ]);
    }
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        color: Colors.light.muted,
        text: "Verifying location...",
      };
    }
  };

  const locationStatus = getLocationStatus();
  const isFormValid =
    locationVerified && busynessRating >= 1 && busynessRating <= 5;

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

        {/* Busyness Rating */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            How busy is it? *
          </ThemedText>
          <View style={styles.ratingContainer}>
            <StarRating
              rating={busynessRating}
              size={32}
              color={Colors.light.tint}
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
            style={styles.commentInput}
            placeholder="Share what's happening right now..."
            placeholderTextColor={Colors.light.muted}
            value={comment}
            onChangeText={setComment}
            maxLength={280}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <ThemedText style={styles.characterCount}>
            {comment.length}/280
          </ThemedText>
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
                    <ActivityIndicator
                      size="small"
                      color={Colors.light.background}
                    />
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
                  <ActivityIndicator size="small" color={Colors.light.tint} />
                  <ThemedText style={styles.addPhotoText}>
                    Processing...
                  </ThemedText>
                </>
              ) : (
                <>
                  <Ionicons name="camera" size={24} color={Colors.light.tint} />
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
            (!isFormValid || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={Colors.light.background} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
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
    color: Colors.light.muted,
  },
  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  ratingContainer: {
    alignItems: "center",
    padding: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
  },
  ratingLabel: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.light.tint,
  },
  commentInput: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: Colors.light.text,
    minHeight: 100,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  characterCount: {
    textAlign: "right",
    marginTop: 4,
    fontSize: 12,
    color: Colors.light.muted,
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
    backgroundColor: Colors.light.background,
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.light.border,
    borderStyle: "dashed",
  },
  addPhotoText: {
    marginLeft: 8,
    fontSize: 16,
    color: Colors.light.tint,
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
    color: Colors.light.background,
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
    backgroundColor: Colors.light.background,
    borderRadius: 2,
  },
  actionButtons: {
    flexDirection: "row",
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.text,
  },
  submitButton: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: Colors.light.muted,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.light.background,
  },
});

export default VibeCheckForm;

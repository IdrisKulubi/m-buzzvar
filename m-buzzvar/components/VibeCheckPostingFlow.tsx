import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import VibeCheckForm from './VibeCheckForm';
import { Colors } from '@/constants/Colors';
import {
  Venue,
  VibeCheckFormData,
  LocationVerification,
} from '@/src/lib/types';
import { VibeCheckService } from '@/src/services/VibeCheckService';
import { LocationVerificationService } from '@/src/services/LocationVerificationService';
import { PhotoUploadService, PhotoUploadProgress } from '@/src/services/PhotoUploadService';
import { AppError, ErrorFactory } from '@/src/lib/errors';
import * as Location from 'expo-location';

interface VibeCheckPostingFlowProps {
  venue: Venue;
  onSuccess: () => void;
  onCancel: () => void;
  userId: string;
}

interface FlowState {
  step: 'loading' | 'location_check' | 'form' | 'submitting' | 'success' | 'error';
  locationVerification?: LocationVerification;
  userLocation?: Location.LocationObject;
  error?: AppError;
  rateLimitInfo?: {
    canPost: boolean;
    timeUntilReset?: number;
  };
}

const VibeCheckPostingFlow: React.FC<VibeCheckPostingFlowProps> = ({
  venue,
  onSuccess,
  onCancel,
  userId,
}) => {
  const [flowState, setFlowState] = useState<FlowState>({
    step: 'loading',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<PhotoUploadProgress | null>(null);

  // Initialize the flow by checking location and rate limits
  const initializeFlow = useCallback(async () => {
    try {
      setFlowState({ step: 'loading' });

      // Step 1: Check rate limiting first
      const rateLimitResult = await VibeCheckService.checkRateLimit(userId, venue.id);
      
      if (!rateLimitResult.canPost) {
        setFlowState({
          step: 'error',
          error: ErrorFactory.rateLimited(rateLimitResult.timeUntilReset || 3600000),
          rateLimitInfo: rateLimitResult,
        });
        return;
      }

      // Step 2: Get user location and verify
      setFlowState({ step: 'location_check' });
      
      const locationResult = await LocationVerificationService.getCurrentLocation();
      
      if (locationResult.error || !locationResult.location) {
        setFlowState({
          step: 'error',
          error: locationResult.error || ErrorFactory.locationUnavailable(),
        });
        return;
      }

      // Step 3: Verify location against venue
      const verification = await LocationVerificationService.verifyUserAtVenue(
        locationResult.location,
        venue
      );

      // Step 4: Set up form state
      setFlowState({
        step: 'form',
        locationVerification: verification,
        userLocation: locationResult.location,
        rateLimitInfo: rateLimitResult,
      });

    } catch (error) {
      console.error('Flow initialization error:', error);
      setFlowState({
        step: 'error',
        error: ErrorFactory.unknownError(error),
      });
    }
  }, [userId, venue.id]);

  // Handle form submission with comprehensive error handling
  const handleFormSubmit = async (formData: VibeCheckFormData) => {
    if (!flowState.userLocation) {
      Alert.alert('Error', 'Location not available. Please try again.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Step 1: Upload photo if provided
      let photoUrl: string | null = null;
      if (formData.photo) {
        setUploadProgress({ loaded: 0, total: 100, percentage: 0 });
        
        const photoResult = await PhotoUploadService.uploadPhoto(
          formData.photo,
          userId,
          {
            quality: 0.8,
            maxWidth: 1200,
            maxHeight: 1200,
            onProgress: setUploadProgress,
          }
        );

        if (photoResult.error) {
          throw new Error(photoResult.error);
        }
        
        photoUrl = photoResult.data;
        setUploadProgress(null);
      }

      // Step 2: Create vibe check with location verification
      const vibeCheckData: VibeCheckFormData = {
        ...formData,
        photo: photoUrl ? { uri: photoUrl, type: 'image/jpeg', name: 'uploaded' } : undefined,
      };

      const result = await VibeCheckService.createVibeCheck(
        vibeCheckData,
        flowState.userLocation
      );

      if (result.error) {
        throw result.error;
      }

      // Step 3: Success
      setFlowState({ step: 'success' });
      
      // Show success message and close
      Alert.alert(
        'Vibe Check Posted!',
        'Your vibe check has been shared with the community.',
        [
          {
            text: 'OK',
            onPress: onSuccess,
          },
        ]
      );

    } catch (error) {
      console.error('Vibe check submission error:', error);
      
      let appError: AppError;
      if (error instanceof Error) {
        appError = ErrorFactory.unknownError(error);
      } else {
        appError = error as AppError;
      }

      setFlowState(prev => ({
        ...prev,
        error: appError,
      }));

      // Show error alert
      Alert.alert(
        'Failed to Post Vibe Check',
        appError.message,
        [
          {
            text: 'Try Again',
            onPress: () => setFlowState(prev => ({ ...prev, error: undefined })),
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: onCancel,
          },
        ]
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Retry the flow initialization
  const handleRetry = useCallback(async () => {
    await initializeFlow();
  }, [initializeFlow]);

  // Initialize flow on mount
  useEffect(() => {
    initializeFlow();
  }, [initializeFlow]);

  // Render loading state
  const renderLoading = (message: string) => (
    <ThemedView style={styles.centerContainer}>
      <ActivityIndicator size="large" color={Colors.light.tint} />
      <ThemedText style={styles.loadingText}>{message}</ThemedText>
    </ThemedView>
  );

  // Render error state
  const renderError = (error: AppError) => (
    <ThemedView style={styles.centerContainer}>
      <ThemedText style={styles.errorTitle}>Unable to Post Vibe Check</ThemedText>
      <ThemedText style={styles.errorMessage}>{error.message}</ThemedText>
      
      {error.retryable && (
        <ThemedText style={styles.retryButton} onPress={handleRetry}>
          Tap to Retry
        </ThemedText>
      )}
      
      <ThemedText style={styles.cancelButton} onPress={onCancel}>
        Cancel
      </ThemedText>
    </ThemedView>
  );

  // Render based on current flow state
  switch (flowState.step) {
    case 'loading':
      return renderLoading('Checking requirements...');
      
    case 'location_check':
      return renderLoading('Verifying your location...');
      
    case 'submitting':
      return renderLoading('Posting your vibe check...');
      
    case 'success':
      return renderLoading('Success!');
      
    case 'error':
      return renderError(flowState.error!);
      
    case 'form':
      return (
        <ThemedView style={styles.container}>
          <VibeCheckForm
            venue={venue}
            onSubmit={handleFormSubmit}
            onCancel={onCancel}
            isSubmitting={isSubmitting}
            locationVerified={flowState.locationVerification?.is_valid}
            distanceToVenue={flowState.locationVerification?.distance_meters}
            error={flowState.error}
            onRetry={handleRetry}
            rateLimitInfo={flowState.rateLimitInfo}
          />
          
          {/* Upload Progress Overlay */}
          {uploadProgress && (
            <View style={styles.uploadOverlay}>
              <View style={styles.uploadContainer}>
                <ActivityIndicator size="large" color={Colors.light.tint} />
                <ThemedText style={styles.uploadText}>
                  Uploading photo... {Math.round(uploadProgress.percentage)}%
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
        </ThemedView>
      );
      
    default:
      return renderError(ErrorFactory.unknownError());
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: Colors.light.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.semantic.error,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: Colors.light.text,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  retryButton: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.tint,
    textAlign: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    marginBottom: 12,
  },
  cancelButton: {
    fontSize: 16,
    color: Colors.light.muted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadContainer: {
    backgroundColor: Colors.light.background,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 200,
  },
  uploadText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  progressBar: {
    width: 150,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
});

export default VibeCheckPostingFlow;
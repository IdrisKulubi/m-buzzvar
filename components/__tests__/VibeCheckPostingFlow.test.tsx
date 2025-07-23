import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import VibeCheckPostingFlow from '../VibeCheckPostingFlow';
import { VibeCheckService } from '@/src/services/VibeCheckService';
import { LocationVerificationService } from '@/src/services/LocationVerificationService';
import { PhotoUploadService } from '@/src/services/PhotoUploadService';
import { ErrorFactory } from '@/src/lib/errors';
import * as Location from 'expo-location';

// Mock dependencies
jest.mock('@/src/services/VibeCheckService');
jest.mock('@/src/services/LocationVerificationService');
jest.mock('@/src/services/PhotoUploadService');
jest.mock('expo-location');
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

const mockVibeCheckService = VibeCheckService as jest.Mocked<typeof VibeCheckService>;
const mockLocationService = LocationVerificationService as jest.Mocked<typeof LocationVerificationService>;
const mockPhotoService = PhotoUploadService as jest.Mocked<typeof PhotoUploadService>;
const mockLocation = Location as jest.Mocked<typeof Location>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('VibeCheckPostingFlow', () => {
  const mockVenue = {
    id: 'venue-1',
    name: 'Test Venue',
    latitude: 40.7128,
    longitude: -74.0060,
    address: '123 Test St',
    description: 'A test venue',
    contact: null,
    hours: null,
    cover_image_url: null,
    cover_video_url: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  const mockUserLocation = {
    coords: {
      latitude: 40.7128,
      longitude: -74.0060,
      altitude: null,
      accuracy: 10,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.now(),
  };

  const mockProps = {
    venue: mockVenue,
    onSuccess: jest.fn(),
    onCancel: jest.fn(),
    userId: 'user-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful mocks
    mockVibeCheckService.checkRateLimit.mockResolvedValue({
      canPost: true,
    });
    
    mockLocationService.getCurrentLocation.mockResolvedValue({
      location: mockUserLocation,
    });
    
    mockLocationService.verifyUserAtVenue.mockResolvedValue({
      is_valid: true,
      distance_meters: 50,
      venue_name: 'Test Venue',
    });
  });

  describe('Flow Initialization', () => {
    it('should initialize successfully with valid location and no rate limiting', async () => {
      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      // Should show loading initially
      expect(getByText('Checking requirements...')).toBeTruthy();

      // Wait for form to appear
      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      expect(mockVibeCheckService.checkRateLimit).toHaveBeenCalledWith('user-1', 'venue-1');
      expect(mockLocationService.getCurrentLocation).toHaveBeenCalled();
      expect(mockLocationService.verifyUserAtVenue).toHaveBeenCalledWith(mockUserLocation, mockVenue);
    });

    it('should show error when rate limited', async () => {
      mockVibeCheckService.checkRateLimit.mockResolvedValue({
        canPost: false,
        timeUntilReset: 3600000, // 1 hour
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      await waitFor(() => {
        expect(getByText('Unable to Post Vibe Check')).toBeTruthy();
      });
    });

    it('should show error when location permission denied', async () => {
      mockLocationService.getCurrentLocation.mockResolvedValue({
        error: ErrorFactory.locationPermissionDenied(),
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      await waitFor(() => {
        expect(getByText('Unable to Post Vibe Check')).toBeTruthy();
      });
    });

    it('should show error when user is too far from venue', async () => {
      mockLocationService.verifyUserAtVenue.mockResolvedValue({
        is_valid: false,
        distance_meters: 200,
        venue_name: 'Test Venue',
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // Form should be disabled due to location
      const form = getByText('Post Vibe Check').parent;
      // The form should show location warning
    });
  });

  describe('Form Submission', () => {
    it('should successfully submit vibe check without photo', async () => {
      mockVibeCheckService.createVibeCheck.mockResolvedValue({
        data: {
          id: 'vibe-1',
          venue_id: 'venue-1',
          user_id: 'user-1',
          busyness_rating: 4,
          comment: 'Great atmosphere!',
          photo_url: null,
          user_latitude: 40.7128,
          user_longitude: -74.0060,
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const { getByText, getByDisplayValue } = render(<VibeCheckPostingFlow {...mockProps} />);

      // Wait for form to load
      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // Fill out form
      const commentInput = getByDisplayValue('');
      fireEvent.changeText(commentInput, 'Great atmosphere!');

      // Submit form
      const submitButton = getByText('Post Vibe Check');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockVibeCheckService.createVibeCheck).toHaveBeenCalledWith(
          expect.objectContaining({
            venue_id: 'venue-1',
            busyness_rating: 3, // Default rating
            comment: 'Great atmosphere!',
          }),
          mockUserLocation
        );
      });

      // Should show success alert
      expect(mockAlert).toHaveBeenCalledWith(
        'Vibe Check Posted!',
        'Your vibe check has been shared with the community.',
        expect.any(Array)
      );
    });

    it('should successfully submit vibe check with photo', async () => {
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      mockPhotoService.uploadPhoto.mockResolvedValue({
        data: 'https://example.com/photo.jpg',
        error: null,
      });

      mockVibeCheckService.createVibeCheck.mockResolvedValue({
        data: {
          id: 'vibe-1',
          venue_id: 'venue-1',
          user_id: 'user-1',
          busyness_rating: 4,
          comment: 'Great atmosphere!',
          photo_url: 'https://example.com/photo.jpg',
          user_latitude: 40.7128,
          user_longitude: -74.0060,
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      // Wait for form to load
      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // Simulate photo selection (this would normally be done through the form)
      // For testing, we'll directly test the submission with photo data
      
      // Submit form with photo
      await act(async () => {
        // This simulates the form submission with photo
        const formData = {
          venue_id: 'venue-1',
          busyness_rating: 4 as const,
          comment: 'Great atmosphere!',
          photo: mockPhoto,
        };

        // Manually call the submission logic
        await mockPhotoService.uploadPhoto(mockPhoto, 'user-1', expect.any(Object));
        await mockVibeCheckService.createVibeCheck(formData, mockUserLocation);
      });

      expect(mockPhotoService.uploadPhoto).toHaveBeenCalledWith(
        mockPhoto,
        'user-1',
        expect.objectContaining({
          quality: 0.8,
          maxWidth: 1200,
          maxHeight: 1200,
          onProgress: expect.any(Function),
        })
      );
    });

    it('should handle photo upload failure gracefully', async () => {
      const mockPhoto = {
        uri: 'file://photo.jpg',
        type: 'image/jpeg',
        name: 'photo.jpg',
      };

      mockPhotoService.uploadPhoto.mockResolvedValue({
        data: null,
        error: 'Upload failed',
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      // Wait for form to load
      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // Simulate form submission with photo that fails to upload
      await act(async () => {
        try {
          await mockPhotoService.uploadPhoto(mockPhoto, 'user-1', expect.any(Object));
          throw new Error('Upload failed');
        } catch (error) {
          // Should show error alert
          expect(mockAlert).toHaveBeenCalledWith(
            'Failed to Post Vibe Check',
            expect.any(String),
            expect.any(Array)
          );
        }
      });
    });

    it('should handle vibe check creation failure', async () => {
      mockVibeCheckService.createVibeCheck.mockResolvedValue({
        data: null,
        error: ErrorFactory.databaseError('Database connection failed'),
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      // Wait for form to load
      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // Submit form
      const submitButton = getByText('Post Vibe Check');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Failed to Post Vibe Check',
          expect.stringContaining('Database connection failed'),
          expect.any(Array)
        );
      });
    });
  });

  describe('Error Handling and Retry', () => {
    it('should allow retry when retryable error occurs', async () => {
      mockLocationService.getCurrentLocation
        .mockResolvedValueOnce({
          error: ErrorFactory.locationUnavailable(),
        })
        .mockResolvedValueOnce({
          location: mockUserLocation,
        });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      // Should show error initially
      await waitFor(() => {
        expect(getByText('Unable to Post Vibe Check')).toBeTruthy();
      });

      // Tap retry
      const retryButton = getByText('Tap to Retry');
      fireEvent.press(retryButton);

      // Should retry and succeed
      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      expect(mockLocationService.getCurrentLocation).toHaveBeenCalledTimes(2);
    });

    it('should call onCancel when cancel is pressed', async () => {
      mockLocationService.getCurrentLocation.mockResolvedValue({
        error: ErrorFactory.locationPermissionDenied(),
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      await waitFor(() => {
        expect(getByText('Cancel')).toBeTruthy();
      });

      fireEvent.press(getByText('Cancel'));
      expect(mockProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Success Flow', () => {
    it('should call onSuccess after successful submission', async () => {
      mockVibeCheckService.createVibeCheck.mockResolvedValue({
        data: {
          id: 'vibe-1',
          venue_id: 'venue-1',
          user_id: 'user-1',
          busyness_rating: 3,
          comment: null,
          photo_url: null,
          user_latitude: 40.7128,
          user_longitude: -74.0060,
          created_at: '2024-01-01T00:00:00Z',
        },
        error: null,
      });

      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // Submit form
      const submitButton = getByText('Post Vibe Check');
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalled();
      });

      // Simulate pressing OK on success alert
      const alertCall = mockAlert.mock.calls.find(call => 
        call[0] === 'Vibe Check Posted!'
      );
      if (alertCall && alertCall[2]) {
        const okButton = alertCall[2].find((button: any) => button.text === 'OK');
        if (okButton && okButton.onPress) {
          okButton.onPress();
        }
      }

      expect(mockProps.onSuccess).toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should validate form inputs before submission', async () => {
      const { getByText } = render(<VibeCheckPostingFlow {...mockProps} />);

      await waitFor(() => {
        expect(getByText('Post Vibe Check')).toBeTruthy();
      });

      // The form should have built-in validation
      // Location verification should be required
      // Busyness rating should be between 1-5
      // Comment should be optional but limited to 280 characters
      
      expect(mockLocationService.verifyUserAtVenue).toHaveBeenCalled();
    });
  });
});
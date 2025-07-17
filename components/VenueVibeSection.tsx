import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import VibeCheckCard from './VibeCheckCard';
import BusynessIndicator from './BusynessIndicator';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import {
  Venue,
  VibeCheckWithDetails,
  LocationVerification,
} from '@/src/lib/types';
import { VibeCheckService } from '@/src/services/VibeCheckService';
import { LocationVerificationService } from '@/src/services/LocationVerificationService';

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
  const [vibeChecks, setVibeChecks] = useState<VibeCheckWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [canPostVibeCheck, setCanPostVibeCheck] = useState(false);
  const [locationVerification, setLocationVerification] =
    useState<LocationVerification | null>(null);
  const [averageBusyness, setAverageBusyness] = useState<number | null>(null);

  // Load vibe checks for the venue
  const loadVibeChecks = async (showRefreshing = false) => {
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
        console.error('Error loading vibe checks:', error);
        Alert.alert('Error', 'Failed to load vibe checks. Please try again.');
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
      console.error('Error loading vibe checks:', error);
      Alert.alert('Error', 'Failed to load vibe checks. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Check if user can post vibe check (location verification)
  const checkLocationPermission = async () => {
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
      console.error('Error checking location:', error);
      setCanPostVibeCheck(false);
      setLocationVerification(null);
    }
  };

  useEffect(() => {
    loadVibeChecks();
    checkLocationPermission();
  }, [venue.id]);

  const handleRefresh = () => {
    loadVibeChecks(true);
    checkLocationPermission();
  };

  const handlePostVibeCheck = () => {
    if (!canPostVibeCheck && locationVerification) {
      const distanceText = LocationVerificationService.getDistanceDescription(
        locationVerification.distance_meters
      );
      Alert.alert(
        'Too Far Away',
        `You need to be within 100m of ${venue.name} to post a vibe check. You are currently ${distanceText}.`,
        [{ text: 'OK' }]
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
          canPostVibeCheck ? styles.postButtonEnabled : styles.postButtonDisabled,
        ]}
        onPress={handlePostVibeCheck}
        disabled={!canPostVibeCheck}
      >
        <Ionicons
          name="add-circle"
          size={20}
          color={canPostVibeCheck ? Colors.light.background : Colors.light.muted}
        />
        <ThemedText
          style={[
            styles.postButtonText,
            canPostVibeCheck
              ? styles.postButtonTextEnabled
              : styles.postButtonTextDisabled,
          ]}
        >
          Post Vibe Check
        </ThemedText>
      </TouchableOpacity>

      {locationVerification && !canPostVibeCheck && (
        <View style={styles.locationWarning}>
          <Ionicons
            name="location-outline"
            size={16}
            color={Colors.semantic.warning}
          />
          <ThemedText style={styles.locationWarningText}>
            You need to be within 100m to post (
            {LocationVerificationService.getDistanceDescription(
              locationVerification.distance_meters
            )}
            )
          </ThemedText>
        </View>
      )}
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="chatbubble-outline"
        size={48}
        color={Colors.light.muted}
      />
      <ThemedText style={styles.emptyTitle}>No Recent Vibe Checks</ThemedText>
      <ThemedText style={styles.emptyDescription}>
        Be the first to share what's happening at {venue.name}!
      </ThemedText>
    </View>
  );

  const renderVibeChecks = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>Loading vibe checks...</ThemedText>
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
            onVenuePress={onVibeCheckPress ? () => onVibeCheckPress(vibeCheck) : undefined}
          />
        ))}
      </View>
    );
  };

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    color: Colors.light.text,
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  averageLabel: {
    fontSize: 12,
    color: Colors.light.muted,
    marginRight: 6,
  },
  averageValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.light.text,
    marginLeft: 6,
  },
  postButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  postButtonEnabled: {
    backgroundColor: Colors.light.tint,
  },
  postButtonDisabled: {
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  postButtonTextEnabled: {
    color: Colors.light.background,
  },
  postButtonTextDisabled: {
    color: Colors.light.muted,
  },
  locationWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7', // Light yellow background
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  locationWarningText: {
    fontSize: 12,
    color: Colors.semantic.warning,
    marginLeft: 6,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.light.muted,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.light.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  vibeChecksList: {
    paddingBottom: 16,
  },
});

export default VenueVibeSection;
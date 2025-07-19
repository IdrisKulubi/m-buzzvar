import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import BusynessIndicator from './BusynessIndicator';
import { Colors } from '@/constants/Colors';
import { VibeCheckWithDetails } from '@/src/lib/types';
import { Ionicons } from '@expo/vector-icons';

interface VibeCheckCardProps {
  vibeCheck: VibeCheckWithDetails;
  onVenuePress?: (venueId: string) => void;
  onUserPress?: (userId: string) => void;
  showVenue?: boolean;
}

const VibeCheckCard: React.FC<VibeCheckCardProps> = ({
  vibeCheck,
  onVenuePress,
  onUserPress,
  showVenue = false,
}) => {
  const handleVenuePress = () => {
    if (onVenuePress) {
      onVenuePress(vibeCheck.venue_id);
    }
  };

  const handleUserPress = () => {
    if (onUserPress) {
      onUserPress(vibeCheck.user_id);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with user info and venue */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.userInfo} 
          onPress={handleUserPress}
          disabled={!onUserPress}
        >
          <View style={styles.avatar}>
            {vibeCheck.user.avatar_url ? (
              <Image 
                source={{ uri: vibeCheck.user.avatar_url }} 
                style={styles.avatarImage}
              />
            ) : (
              <Ionicons 
                name="person-circle" 
                size={40} 
                color={Colors.light.muted} 
              />
            )}
          </View>
          <View style={styles.userDetails}>
            <ThemedText type="defaultSemiBold" style={styles.userName}>
              {vibeCheck.user.name}
            </ThemedText>
            <ThemedText style={styles.timestamp}>
              {vibeCheck.time_ago}
            </ThemedText>
          </View>
        </TouchableOpacity>

        {showVenue && (
          <TouchableOpacity 
            style={styles.venueInfo}
            onPress={handleVenuePress}
            disabled={!onVenuePress}
          >
            <Ionicons 
              name="location" 
              size={16} 
              color={Colors.light.tint} 
            />
            <ThemedText style={styles.venueName} numberOfLines={1}>
              {vibeCheck.venue.name}
            </ThemedText>
          </TouchableOpacity>
        )}
      </View>

      {/* Busyness rating */}
      <View style={styles.busynessSection}>
        <BusynessIndicator 
          rating={vibeCheck.busyness_rating}
          size="medium"
          showLabel={true}
        />
        {vibeCheck.is_recent && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <ThemedText style={styles.liveText}>LIVE</ThemedText>
          </View>
        )}
      </View>

      {/* Comment */}
      {vibeCheck.comment && (
        <View style={styles.commentSection}>
          <ThemedText style={styles.comment}>
            {vibeCheck.comment}
          </ThemedText>
        </View>
      )}

      {/* Photo */}
      {vibeCheck.photo_url && (
        <View style={styles.photoSection}>
          <Image 
            source={{ uri: vibeCheck.photo_url }} 
            style={styles.photo}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Venue info (when not showing venue in header) */}
      {!showVenue && (
        <TouchableOpacity 
          style={styles.venueFooter}
          onPress={handleVenuePress}
          disabled={!onVenuePress}
        >
          <Ionicons 
            name="location-outline" 
            size={14} 
            color={Colors.light.muted} 
          />
          <ThemedText style={styles.venueFooterText} numberOfLines={1}>
            {vibeCheck.venue.name}
          </ThemedText>
          {vibeCheck.venue.address && (
            <>
              <ThemedText style={styles.venueSeparator}> • </ThemedText>
              <ThemedText style={styles.venueAddress} numberOfLines={1}>
                {vibeCheck.venue.address}
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    marginBottom: 2,
  },
  timestamp: {
    fontSize: 12,
    color: Colors.light.muted,
  },
  venueInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 120,
  },
  venueName: {
    fontSize: 14,
    color: Colors.light.tint,
    marginLeft: 4,
    fontWeight: '600',
  },
  busynessSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.semantic.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.background,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.light.background,
    letterSpacing: 0.5,
  },
  commentSection: {
    marginBottom: 12,
  },
  comment: {
    fontSize: 15,
    lineHeight: 20,
  },
  photoSection: {
    marginBottom: 12,
  },
  photo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  venueFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  venueFooterText: {
    fontSize: 14,
    color: Colors.light.muted,
    marginLeft: 4,
    fontWeight: '500',
  },
  venueSeparator: {
    fontSize: 14,
    color: Colors.light.muted,
  },
  venueAddress: {
    fontSize: 14,
    color: Colors.light.muted,
    flex: 1,
  },
});

export default VibeCheckCard;
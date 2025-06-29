import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const VenueDetailsSheet = ({ venue }: { venue: any }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);

  const formatHours = (hours: string | null) => {
    if (!hours) return 'Hours not available';
    try {
      const hoursObj = JSON.parse(hours);
      const today = new Date().toLocaleString('en-us', { weekday: 'long' }).toLowerCase();
      return `Today: ${hoursObj[today] || 'Not specified'}`;
    } catch (e: any) {
      console.error(e);
      return hours;
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={{ uri: venue.cover_image_url }} style={styles.headerImage} />
      
      <View style={styles.content}>
        <Text style={styles.title}>{venue.name}</Text>
        
        {venue.promotions?.length > 0 && (
          <View style={styles.promotionBadge}>
            <Ionicons name="star" size={16} color={colors.background} />
            <Text style={styles.promotionText}>{venue.promotions[0].title}</Text>
          </View>
        )}
        
        <Text style={styles.description}>{venue.description}</Text>
        
        <View style={styles.separator} />
        
        <Text style={styles.sectionTitle}>Details</Text>
        
        <View style={styles.infoRow}>
          <Ionicons name="location-outline" size={20} color={colors.tint} style={styles.infoIcon} />
          <Text style={styles.infoText}>{venue.address}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Feather name="clock" size={20} color={colors.tint} style={styles.infoIcon} />
          <Text style={styles.infoText}>{formatHours(venue.hours)}</Text>
        </View>
        
        {venue.contact && (
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color={colors.tint} style={styles.infoIcon} />
            <Text style={styles.infoText}>{venue.contact}</Text>
          </View>
        )}
        
        {/* You can add Menu & Promotions sections here if needed */}
        
      </View>
    </ScrollView>
  );
};

const getStyles = (colors: any) => StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  headerImage: {
    width: '100%',
    height: 250,
    backgroundColor: colors.border,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: colors.muted,
    lineHeight: 24,
    marginBottom: 20,
  },
  promotionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  promotionText: {
    color: colors.background,
    fontWeight: 'bold',
    fontSize: 14,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  infoIcon: {
    marginRight: 16,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    lineHeight: 22,
  },
});

export default VenueDetailsSheet; 
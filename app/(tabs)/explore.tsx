import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function ExploreScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 40,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 12,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 18,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 26,
    },
    comingSoonCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    comingSoonTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 16,
    },
    featuresList: {
      gap: 16,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>
            Discover clubs, venues, and events in your area
          </Text>
        </View>

        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>Coming Soon! 🚀</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="storefront" size={20} color={colors.background} />
              </View>
              <Text style={styles.featureText}>Discover nearby clubs and venues</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="map" size={20} color={colors.background} />
              </View>
              <Text style={styles.featureText}>Interactive map view</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="filter" size={20} color={colors.background} />
              </View>
              <Text style={styles.featureText}>Filter by music, vibe, and distance</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="star" size={20} color={colors.background} />
              </View>
              <Text style={styles.featureText}>Reviews and ratings</Text>
            </View>

            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="bookmark" size={20} color={colors.background} />
              </View>
              <Text style={styles.featureText}>Save your favorite spots</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
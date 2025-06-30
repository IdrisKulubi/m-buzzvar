import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

export default function AboutScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    logo: {
      width: 100,
      height: 100,
      marginBottom: 16,
    },
    appName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.text,
    },
    version: {
      fontSize: 16,
      color: colors.muted,
      marginTop: 4,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 16,
      color: colors.text,
      lineHeight: 24,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: 'About Buzzvar',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ paddingHorizontal: 10 }}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        }} 
      />
      <ScrollView>
        <View style={styles.content}>
          <View style={styles.header}>
            <Image source={require('../assets/logo/buzzvarlogo.png')} style={styles.logo} />
            <Text style={styles.appName}>Buzzvar</Text>
            <Text style={styles.version}>Version 1.0.0</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What is Buzzvar?</Text>
            <Text style={styles.paragraph}>
              Buzzvar is your ultimate companion for discovering the most exciting parties, events, and venues in your city. Whether you&apos;re looking for a chill lounge, a high-energy club, or an exclusive event, Buzzvar helps you find the perfect spot for your night out.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Our Mission</Text>
            <Text style={styles.paragraph}>
              Our mission is to connect people with unforgettable experiences. We believe that a great night out can create lasting memories, and we&apos;re dedicated to making it easier than ever to find and enjoy those moments.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
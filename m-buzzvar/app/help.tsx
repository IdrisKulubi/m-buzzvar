import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const faqs = [
  {
    question: 'How do I find venues?',
    answer: 'Use the "Explore" tab to see a feed of venues. You can swipe through them to discover new places. The "Home" tab also shows featured venues and your bookmarks.',
  },
  {
    question: 'How do I save a venue?',
    answer: 'On any venue card in the "Explore" feed, tap the "Save" button with the bookmark icon. You can find all your saved venues in the "Your Bookmarks" section on the Home screen.',
  },
  {
    question: 'How can I edit my profile?',
    answer: 'Go to the "Profile" tab and tap the pencil icon at the top right of the hero section. This will take you to the edit profile screen.',
  },
];

export default function HelpScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@buzzvar.app?subject=App Support');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
    },
    section: {
      marginBottom: 30,
    },
    sectionTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 16,
    },
    faqItem: {
      marginBottom: 20,
    },
    faqQuestion: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    faqAnswer: {
      fontSize: 16,
      color: colors.muted,
      lineHeight: 24,
    },
    contactButton: {
      backgroundColor: colors.tint,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 10,
    },
    contactButtonText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.background,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: 'Help & Support',
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            {faqs.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Us</Text>
            <TouchableOpacity style={styles.contactButton} onPress={handleContactSupport}>
              <Ionicons name="mail-outline" size={20} color={colors.background} />
              <Text style={styles.contactButtonText}>Email Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
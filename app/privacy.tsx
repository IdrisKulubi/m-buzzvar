import React from 'react';
import { View, Text, StyleSheet, useColorScheme, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const PolicySection = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = StyleSheet.create({
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 12,
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
};

const Paragraph = ({ children }: { children: string }) => {
    const colorScheme = useColorScheme() ?? 'dark';
    const colors = Colors[colorScheme];
    const styles = StyleSheet.create({
        paragraph: {
            fontSize: 16,
            color: colors.muted,
            lineHeight: 24,
            marginBottom: 12,
        }
    });
    return <Text style={styles.paragraph}>{children}</Text>;
};

export default function PrivacyScreen() {
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
    lastUpdated: {
        fontSize: 14,
        color: colors.muted,
        marginBottom: 20,
        fontStyle: 'italic',
    }
  });

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: 'Privacy & Security',
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
            <Text style={styles.lastUpdated}>Last Updated: June 30, 2025</Text>
            
            <Paragraph>
                Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application, Buzzvar.
            </Paragraph>

            <PolicySection title="Information We Collect">
                <Paragraph>
                    We may collect information about you in a variety of ways. The information we may collect via the Application includes:
                    - Personal Data: Personally identifiable information, such as your name, email address, and demographic information (like your university), that you voluntarily give to us when you register with the Application.
                    - Location Data: We may request access or permission to and track location-based information from your mobile device to provide location-based services.
                    - Usage Data: Information our servers automatically collect when you access the Application, such as your interactions with venues, bookmarks, and other users.
                </Paragraph>
            </PolicySection>

            <PolicySection title="Use of Your Information">
                <Paragraph>
                    Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
                    - Create and manage your account.
                    - Email you regarding your account or order.
                    - Show you venues and events that are nearby.
                    - Monitor and analyze usage and trends to improve your experience.
                </Paragraph>
            </PolicySection>
            
            <PolicySection title="Security of Your Information">
                <Paragraph>
                    We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
                </Paragraph>
            </PolicySection>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 
import React from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function TestVisibilityScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, { backgroundColor: colors.background }]}>
        
        {/* Test with explicit colors */}
        <Text style={{ color: '#FFFFFF', fontSize: 24, marginBottom: 20 }}>
          WHITE TEXT TEST - Should be visible on dark background
        </Text>
        
        <Text style={{ color: '#000000', fontSize: 24, marginBottom: 20, backgroundColor: '#FFFFFF', padding: 10 }}>
          BLACK TEXT TEST - Should be visible on white background
        </Text>
        
        <Text style={{ color: colors.text, fontSize: 20, marginBottom: 10 }}>
          Theme Text Color: {colors.text}
        </Text>
        
        <Text style={{ color: colors.tint, fontSize: 20, marginBottom: 10 }}>
          Gold Tint Color: {colors.tint}
        </Text>
        
        <Text style={{ color: colors.muted, fontSize: 16, marginBottom: 20 }}>
          Muted Color: {colors.muted}
        </Text>
        
        <Text style={{ color: '#FFFFFF', fontSize: 16, marginBottom: 20 }}>
          Current scheme: {colorScheme}
        </Text>
        
        <Text style={{ color: '#FFFFFF', fontSize: 16, marginBottom: 20 }}>
          Background: {colors.background}
        </Text>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: colors.background, fontSize: 16, fontWeight: '600' }}>
            Go Back
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#D4AF37', marginTop: 10 }]}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#000000', fontSize: 16, fontWeight: '600' }}>
            Go Back (Explicit Gold)
          </Text>
        </TouchableOpacity>
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Explicit black
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
}); 
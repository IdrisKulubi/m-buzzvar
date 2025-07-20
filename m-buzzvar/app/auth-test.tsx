import React from 'react'
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native'
import AuthTest from '@/components/auth/AuthTest'

export default function AuthTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <AuthTest />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
})
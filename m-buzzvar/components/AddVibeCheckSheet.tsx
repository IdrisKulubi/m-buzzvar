import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, useColorScheme, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, TouchableWithoutFeedback, Keyboard, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAuth } from '../src/lib/hooks';
import { useToast } from '../src/lib/ToastProvider';
import { VibeCheckServiceStandalone } from '../src/services/VibeCheckServiceStandalone';

const BUSYNESS_LEVELS = [
  { level: 1, label: 'Empty', icon: 'battery-dead' },
  { level: 2, label: 'Quiet', icon: 'battery-quarter' },
  { level: 3, label: 'Just Right', icon: 'battery-half' },
  { level: 4, label: 'Packed', icon: 'battery-three-quarters' },
  { level: 5, label: 'At Capacity', icon: 'battery-full' },
];

const AddVibeCheckSheet = ({ venueId, onSubmitted }: { venueId: string; onSubmitted: () => void }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [busyness, setBusyness] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      showToast({ type: 'error', message: 'You must be logged in to post.' });
      return;
    }
    if (busyness === 0) {
      Alert.alert('Busyness Rating Required', 'Please select a busyness level.');
      return;
    }

    setLoading(true);
    
    // Get current location for verification
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    const { error } = await VibeCheckServiceStandalone.createVibeCheck(
      {
        venue_id: venueId,
        busyness_rating: busyness as 1 | 2 | 3 | 4 | 5,
        comment,
      },
      location
    );
    setLoading(false);

    if (error) {
      showToast({ type: 'error', message: "Couldn't post your vibe. Please try again." });
    } else {
      showToast({ type: 'success', message: 'Vibe check posted! Thanks for contributing. 🔥' });
      onSubmitted();
    }
  }, [busyness, comment, user, venueId, onSubmitted, showToast]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>How&apos;s the Vibe?</Text>
          
          <Text style={styles.label}>Busyness Level</Text>
          <View style={styles.busynessContainer}>
            {BUSYNESS_LEVELS.map(({level, label, icon}) => (
              <TouchableOpacity key={level} style={styles.busynessOption} onPress={() => setBusyness(level)}>
                <Ionicons name={busyness === level ? icon : `${icon}-outline` as any} size={30} color={busyness === level ? colors.tint : colors.muted} />
                <Text style={[styles.busynessLabel, busyness === level && {color: colors.tint, fontWeight: 'bold'}]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={styles.label}>Your Comment (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 'Live band is amazing, but the line is long!'"
            placeholderTextColor={colors.muted}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color={colors.background} /> : <Text style={styles.buttonText}>Post Vibe Check</Text>}
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      padding: 24,
      backgroundColor: colors.surface,
      flex: 1,
    },
    title: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 24,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.muted,
      marginBottom: 12,
    },
    busynessContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    busynessOption: {
      alignItems: 'center',
      gap: 6,
    },
    busynessLabel: {
      fontSize: 12,
      color: colors.muted,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    button: {
      backgroundColor: colors.tint,
      padding: 16,
      borderRadius: 12,
      alignItems: 'center',
    },
    buttonDisabled: {
      backgroundColor: colors.muted,
    },
    buttonText: {
      color: colors.background,
      fontSize: 16,
      fontWeight: 'bold',
    },
  });

export default AddVibeCheckSheet; 
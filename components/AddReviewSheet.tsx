import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, useColorScheme, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import StarRating from './StarRating';
import { useAuth } from '../src/lib/hooks';
import { useToast } from '../src/lib/ToastProvider';
import { addReview } from '../src/actions/clubs';

const AddReviewSheet = ({ venueId, onSubmitted }: { venueId: string; onSubmitted: () => void }) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const styles = useMemo(() => getStyles(colors), [colors]);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      showToast({ type: 'error', message: 'You must be logged in to leave a review.' });
      return;
    }
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating before submitting.');
      return;
    }

    setLoading(true);
    const { error } = await addReview({
      venueId,
      userId: user.id,
      rating,
      comment,
    });
    setLoading(false);

    if (error) {
      showToast({ type: 'error', message: "Couldn't save your review. Please try again." });
    } else {
      showToast({ type: 'success', message: 'Thank you for your review! 🎉' });
      onSubmitted();
    }
  }, [rating, comment, user, venueId, onSubmitted, showToast]);

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <Text style={styles.title}>Rate Your Experience</Text>
          
          <View style={styles.starsContainer}>
            <StarRating rating={rating} onRate={setRating} size={36} color={colors.tint} />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tell us about your visit (optional)..."
            placeholderTextColor={colors.muted}
            value={comment}
            onChangeText={setComment}
            multiline
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Submitting...' : 'Submit Review'}</Text>
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
      marginBottom: 20,
    },
    starsContainer: {
      alignItems: 'center',
      marginVertical: 20,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      minHeight: 100,
      textAlignVertical: 'top',
      marginBottom: 20,
    },
    button: {
      backgroundColor: colors.tint,
      padding: 16,
      borderRadius: 8,
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

export default AddReviewSheet; 
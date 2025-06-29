import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, useColorScheme, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

export interface ToastData {
  message: string;
  type?: 'success' | 'error' | 'info';
  icon?: keyof typeof Ionicons.glyphMap;
  duration?: number;
}

interface ToastProps extends ToastData {
  onHide: () => void;
}

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  icon, 
  duration = 3000, 
  onHide 
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const slideAnim = useRef(new Animated.Value(-100)).current;

  const hideToast = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => onHide());
  }, [slideAnim, onHide]);

  useEffect(() => {
    // Provide haptic feedback
    Haptics.notificationAsync(
      type === 'success' ? Haptics.NotificationFeedbackType.Success : 
      type === 'error' ? Haptics.NotificationFeedbackType.Error : 
      Haptics.NotificationFeedbackType.Warning
    );

    // Animate in
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Auto-hide timer
    const timer = setTimeout(() => {
      hideToast();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, hideToast, slideAnim, type]);

  const toastStyle = {
    success: {
      backgroundColor: '#28a745',
      shadowColor: '#28a745',
    },
    error: {
      backgroundColor: colors.destructive,
      shadowColor: colors.destructive,
    },
    info: {
      backgroundColor: colors.tint,
      shadowColor: colors.tint,
    },
  };

  const IconMap = {
    success: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    error: 'alert-circle' as keyof typeof Ionicons.glyphMap,
    info: 'information-circle' as keyof typeof Ionicons.glyphMap,
  };

  const toastIcon = icon || IconMap[type];

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity onPress={hideToast} style={{ flex: 1 }}>
        <SafeAreaView style={[styles.toast, toastStyle[type]]}>
          <Ionicons name={toastIcon} size={24} color="#FFF" style={styles.icon} />
          <Text style={styles.message}>{message}</Text>
        </SafeAreaView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default Toast; 
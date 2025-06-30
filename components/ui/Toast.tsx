import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, useColorScheme, Animated, Easing, TouchableOpacity, Platform } from 'react-native';
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
  const slideAnim = useRef(new Animated.Value(-200)).current;

  const hideToast = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -200,
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
      toValue: Platform.OS === 'ios' ? 20 : 16,
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
      borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    error: {
      backgroundColor: colors.destructive,
      shadowColor: colors.destructive,
      borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    info: {
      backgroundColor: colors.tint,
      shadowColor: colors.tint,
      borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    },
  };

  const IconMap = {
    success: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
    error: 'alert-circle' as keyof typeof Ionicons.glyphMap,
    info: 'information-circle' as keyof typeof Ionicons.glyphMap,
  };

  const toastIcon = icon || IconMap[type];

  return (
    <SafeAreaView 
      style={styles.wrapper} 
      pointerEvents="box-none" 
      edges={['top', 'left', 'right']}
    >
      <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity 
          onPress={hideToast} 
          style={[styles.toast, toastStyle[type]]}
          activeOpacity={0.9}
        >
          <Ionicons name={toastIcon} size={24} color="#FFF" style={styles.icon} />
          <Text style={styles.message}>{message}</Text>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
  },
  container: {
    paddingHorizontal: 16,
    width: '100%',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 24, // Increased for a more modern, "fully curved" look
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
  },
  icon: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Toast; 
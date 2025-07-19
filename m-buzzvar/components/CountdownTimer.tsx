/**
 * Countdown Timer component for displaying rate limiting feedback
 * Shows remaining time until user can perform an action again
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { RateLimitManager } from '@/src/lib/errors';

interface CountdownTimerProps {
  duration: number; // Duration in milliseconds
  onComplete?: () => void;
  onTick?: (remainingMs: number) => void;
  message?: string;
  showIcon?: boolean;
  compact?: boolean;
  style?: any;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  duration,
  onComplete,
  onTick,
  message = "Please wait",
  showIcon = true,
  compact = false,
  style,
}) => {
  const [remainingTime, setRemainingTime] = useState(duration);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!isActive || remainingTime <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        const newTime = Math.max(0, prev - 1000);
        
        // Call onTick callback
        onTick?.(newTime);
        
        // Check if countdown is complete
        if (newTime <= 0) {
          setIsActive(false);
          onComplete?.();
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, remainingTime, onComplete, onTick]);

  const formatTime = (ms: number): string => {
    return RateLimitManager.formatTimeRemaining(ms);
  };

  const getProgressPercentage = (): number => {
    return ((duration - remainingTime) / duration) * 100;
  };

  if (remainingTime <= 0) {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        {showIcon && (
          <Ionicons 
            name="time-outline" 
            size={16} 
            color={Colors.semantic.warning} 
          />
        )}
        <ThemedText style={styles.compactText}>
          {formatTime(remainingTime)}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        {showIcon && (
          <View style={styles.iconContainer}>
            <Ionicons 
              name="time-outline" 
              size={24} 
              color={Colors.semantic.warning} 
            />
          </View>
        )}
        <View style={styles.textContainer}>
          <ThemedText style={styles.message}>
            {message}
          </ThemedText>
          <ThemedText style={styles.timeText}>
            {formatTime(remainingTime)}
          </ThemedText>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${getProgressPercentage()}%` }
            ]} 
          />
        </View>
        <ThemedText style={styles.progressText}>
          {Math.round(getProgressPercentage())}%
        </ThemedText>
      </View>
    </View>
  );
};

interface RateLimitCountdownProps {
  venueId: string;
  timeUntilReset: number;
  onComplete?: () => void;
  compact?: boolean;
  style?: any;
}

export const RateLimitCountdown: React.FC<RateLimitCountdownProps> = ({
  venueId,
  timeUntilReset,
  onComplete,
  compact = false,
  style,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleComplete = () => {
    setIsVisible(false);
    onComplete?.();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <CountdownTimer
      duration={timeUntilReset}
      onComplete={handleComplete}
      message="You can post another vibe check in"
      showIcon={true}
      compact={compact}
      style={style}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${Colors.semantic.warning}10`,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    color: Colors.light.text,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.semantic.warning,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.semantic.warning,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.light.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.semantic.warning,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.light.muted,
    minWidth: 35,
    textAlign: 'right',
  },
});

export default CountdownTimer;
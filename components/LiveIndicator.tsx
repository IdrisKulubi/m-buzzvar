import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { BusynessIndicator } from './BusynessIndicator';

interface LiveIndicatorProps {
  hasLiveActivity: boolean;
  averageBusyness?: number | null;
  recentVibeCount?: number;
  size?: 'small' | 'medium' | 'large';
}

export const LiveIndicator: React.FC<LiveIndicatorProps> = ({
  hasLiveActivity,
  averageBusyness,
  recentVibeCount = 0,
  size = 'medium',
}) => {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  
  const styles = getStyles(colors, size);

  if (!hasLiveActivity && recentVibeCount === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {hasLiveActivity && (
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      )}
      
      {averageBusyness && (
        <View style={styles.busynessContainer}>
          <BusynessIndicator 
            rating={Math.round(averageBusyness) as 1 | 2 | 3 | 4 | 5} 
            size={size === 'large' ? 'medium' : 'small'}
            showLabel={false}
          />
        </View>
      )}
      
      {recentVibeCount > 0 && (
        <View style={styles.countContainer}>
          <Ionicons 
            name="chatbubble-ellipses" 
            size={size === 'large' ? 14 : 12} 
            color={colors.muted} 
          />
          <Text style={styles.countText}>{recentVibeCount}</Text>
        </View>
      )}
    </View>
  );
};

const getStyles = (colors: typeof Colors.dark, size: 'small' | 'medium' | 'large') => {
  const isSmall = size === 'small';
  const isLarge = size === 'large';
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: isLarge ? 8 : 6,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FF4444',
      paddingHorizontal: isLarge ? 8 : 6,
      paddingVertical: isLarge ? 4 : 3,
      borderRadius: isLarge ? 12 : 10,
      gap: isLarge ? 4 : 3,
    },
    liveDot: {
      width: isLarge ? 6 : 4,
      height: isLarge ? 6 : 4,
      borderRadius: isLarge ? 3 : 2,
      backgroundColor: '#FFFFFF',
    },
    liveText: {
      color: '#FFFFFF',
      fontSize: isLarge ? 11 : 9,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    busynessContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    countContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      paddingHorizontal: isLarge ? 6 : 4,
      paddingVertical: isLarge ? 3 : 2,
      borderRadius: isLarge ? 10 : 8,
      gap: isLarge ? 3 : 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    countText: {
      color: colors.muted,
      fontSize: isLarge ? 11 : 9,
      fontWeight: '500',
    },
  });
};

export default LiveIndicator;
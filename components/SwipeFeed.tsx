import { supabase } from '@/src/lib/supabase';
import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  Dimensions, 
  FlatList,
  Animated,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { AntDesign, FontAwesome, Ionicons, Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const SwipeFeed: React.FC = () => {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchVenues = async () => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .limit(20); // Limit for performance

      if (error) {
        console.error('Error fetching venues:', error);
      } else {
        setVenues(data);
      }
      setLoading(false);
    };

    fetchVenues();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: true }
  );

  const renderActionButton = (icon: React.ReactNode, text: string) => (
    <TouchableOpacity style={styles.actionButton}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionText}>{text}</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const inputRange = [
      (index - 1) * height,
      index * height,
      (index + 1) * height,
    ];

    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [0.8, 1, 0.8],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Image 
          source={{ uri: item.cover_image_url || 'https://placehold.co/400' }} 
          style={styles.image} 
        />
        
        {/* Gradient Overlay */}
        <View style={styles.gradientOverlay} />
        
        {/* Venue Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{item.name}</Text>
          <Text style={styles.description}>{item.description}</Text>
          
          <View style={styles.detailsRow}>
            <Ionicons name="location-sharp" size={16} color="white" />
            <Text style={styles.address} numberOfLines={1}>{item.address}</Text>
          </View>
          
          {/* Updated Time Display */}
          <View style={styles.timeContainer}>
            <Feather name="clock" size={16} color="white" />
            <Text style={styles.timeText}>
              {formatHours(item.hours) || 'Open 24/7'}
            </Text>
          </View>
        </View>
        
        {/* Right Action Buttons */}
        <View style={styles.actionContainer}>
          {renderActionButton(
            <AntDesign name="heart" size={32} color="white" />,
            '24.5K'
          )}
          {renderActionButton(
            <FontAwesome name="commenting" size={32} color="white" />,
            '1.2K'
          )}
          {renderActionButton(
            <FontAwesome name="bookmark" size={32} color="white" />,
            'Save'
          )}
          {renderActionButton(
            <Feather name="share" size={32} color="white" />,
            'Share'
          )}
        </View>
      </Animated.View>
    );
  };

  // Helper function to format hours
  const formatHours = (hours: string | null) => {
    if (!hours) return null;

    try {
      const hoursObj = JSON.parse(hours);
      const today = new Date().toLocaleString('en-US', { weekday: 'long' }).toLowerCase();
      const todayHours = hoursObj[today];

      if (todayHours === 'closed') {
        return 'Closed Today';
      }

      if (todayHours) {
        return `Open Today: ${todayHours}`;
      }

      return 'Open 24/7';
    } catch (error) {
      console.error('Error parsing hours:', error);
      return 'Open 24/7';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF3250" />
      </View>
    );
  }

  return (
    <Animated.FlatList
      data={venues}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={(e) => {
        const index = Math.floor(e.nativeEvent.contentOffset.y / height);
        setCurrentIndex(index);
      }}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    width,
    height,
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundImage: 'linear-gradient(to top, rgba(0,0,0,0.8) 20%, transparent 100%)',
  },
  infoContainer: {
    padding: 20,
    marginBottom: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: 'white',
    marginBottom: 15,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  address: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginLeft: 8,
    flexShrink: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  timeText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  actionContainer: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    alignItems: 'center',
  },
  actionButton: {
    marginBottom: 25,
    alignItems: 'center',
  },
  actionIcon: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 25,
    padding: 10,
    marginBottom: 4,
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
});

export default SwipeFeed;
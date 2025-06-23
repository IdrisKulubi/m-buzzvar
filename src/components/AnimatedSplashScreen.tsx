import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Dimensions, 
  Animated, 
  Easing,
  Image,
  useColorScheme 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const colorScheme = useColorScheme() ?? 'dark';
  
  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const curtainLeft = useRef(new Animated.Value(0)).current;
  const curtainRight = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textScale = useRef(new Animated.Value(0.8)).current;
  const backgroundOpacity = useRef(new Animated.Value(1)).current;
  const goldGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const runAnimation = () => {
      // Phase 1: Logo entrance with scale and rotation
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.bounce,
          useNativeDriver: true,
        }),
        Animated.timing(logoRotation, {
          toValue: 1,
          duration: 1000,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 2: Gold glow effect
        Animated.timing(goldGlow, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }).start(() => {
          // Phase 3: Text appearance
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 500,
              easing: Easing.ease,
              useNativeDriver: true,
            }),
            Animated.timing(textScale, {
              toValue: 1,
              duration: 500,
              easing: Easing.bounce,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Phase 4: Wait a moment, then curtain animation
            setTimeout(() => {
              Animated.parallel([
                // Curtain slide animation (similar to Uber)
                Animated.timing(curtainLeft, {
                  toValue: -width,
                  duration: 800,
                  easing: Easing.ease,
                  useNativeDriver: true,
                }),
                Animated.timing(curtainRight, {
                  toValue: width,
                  duration: 800,
                  easing: Easing.ease,
                  useNativeDriver: true,
                }),
                // Fade out background
                Animated.timing(backgroundOpacity, {
                  toValue: 0,
                  duration: 800,
                  easing: Easing.ease,
                  useNativeDriver: true,
                }),
              ]).start(() => {
                // Animation complete
                onAnimationComplete();
              });
            }, 1000); // Wait 1 second before curtain animation
          });
        });
      });
    };

    runAnimation();
  }, []);

  const logoRotationInterpolate = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const goldGlowInterpolate = goldGlow.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 1, 0.3],
  });

  return (
    <>
      <StatusBar style="light" />
      <View style={styles.container}>
        {/* Background with gradient */}
        <Animated.View 
          style={[
            styles.backgroundContainer,
            { opacity: backgroundOpacity }
          ]}
        >
          <LinearGradient
            colors={['#000000', '#1a1a1a', '#000000']}
            style={styles.gradient}
            locations={[0, 0.5, 1]}
          >
            {/* Animated gold particles */}
            <View style={styles.particlesContainer}>
              {[...Array(6)].map((_, index) => (
                <Animated.View
                  key={index}
                  style={[
                    styles.particle,
                    {
                      left: `${15 + index * 12}%`,
                      top: `${20 + (index % 3) * 20}%`,
                      opacity: goldGlowInterpolate,
                      transform: [
                        {
                          scale: goldGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0.5, 1.2],
                          })
                        }
                      ]
                    }
                  ]}
                />
              ))}
            </View>

            {/* Main logo container */}
            <View style={styles.logoSection}>
              <Animated.View
                style={[
                  styles.logoContainer,
                  {
                    opacity: logoOpacity,
                    transform: [
                      { scale: logoScale },
                      { rotate: logoRotationInterpolate }
                    ]
                  }
                ]}
              >
                {/* Glow effect */}
                <Animated.View
                  style={[
                    styles.logoGlow,
                    {
                      opacity: goldGlowInterpolate,
                      transform: [
                        {
                          scale: goldGlow.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.3],
                          })
                        }
                      ]
                    }
                  ]}
                />
                
                <Image
                  source={require('../../assets/logo/buzzvarlogo.png')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </Animated.View>

              {/* App name */}
              <Animated.View
                style={[
                  styles.textContainer,
                  {
                    opacity: textOpacity,
                    transform: [{ scale: textScale }]
                  }
                ]}
              >
                <Text style={styles.appName}>BUZZVAR</Text>
                <Text style={styles.tagline}>Party Like Never Before</Text>
              </Animated.View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Curtain animation layers */}
        <Animated.View
          style={[
            styles.curtainLeft,
            {
              transform: [{ translateX: curtainLeft }]
            }
          ]}
        >
          <LinearGradient
            colors={['oklch(0.83 0.1 83.77)', 'oklch(0.75 0.12 83.77)']}
            style={styles.curtainGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.curtainRight,
            {
              transform: [{ translateX: curtainRight }]
            }
          ]}
        >
          <LinearGradient
            colors={['oklch(0.75 0.12 83.77)', 'oklch(0.83 0.1 83.77)']}
            style={styles.curtainGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  backgroundContainer: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'oklch(0.83 0.1 83.77)',
  },
  logoSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'oklch(0.83 0.1 83.77)',
    opacity: 0.3,
  },
  logo: {
    width: 140,
    height: 140,
    zIndex: 1,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 4,
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'oklch(0.83 0.1 83.77)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  tagline: {
    fontSize: 16,
    color: 'oklch(0.83 0.1 83.77)',
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  curtainLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width / 2,
    height: height,
    zIndex: 10,
  },
  curtainRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width / 2,
    height: height,
    zIndex: 10,
  },
  curtainGradient: {
    flex: 1,
  },
}); 
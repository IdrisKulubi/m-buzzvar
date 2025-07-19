import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

interface AnimatedSplashScreenProps {
  onAnimationComplete: () => void;
}

export default function AnimatedSplashScreen({
  onAnimationComplete,
}: AnimatedSplashScreenProps) {
  // Simplified animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const runAnimation = () => {
      // Phase 1: Logo entrance
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 2: Text entrance
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start(() => {
          // Phase 3: Wait longer then fade out
          setTimeout(() => {
            Animated.timing(fadeOut, {
              toValue: 0,
              duration: 500,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }).start(() => {
              onAnimationComplete();
            });
          }, 10000);
        });
      });
    };

    runAnimation();
  }, [logoOpacity, logoScale, textOpacity, fadeOut, onAnimationComplete]);

  return (
    <>
      <StatusBar style="light" />
      <Animated.View style={[styles.container, { opacity: fadeOut }]}>
        <LinearGradient
          colors={["#0a0a0a", "#1a0a2e", "#16213e"]}
          style={styles.gradient}
        >
          <View style={styles.contentContainer}>
            {/* Logo */}
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  opacity: logoOpacity,
                  transform: [{ scale: logoScale }],
                },
              ]}
            >
              <Image
                source={require("../../assets/logo/buzzvarlogo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </Animated.View>

            {/* Text */}
            <Animated.View
              style={[styles.textContainer, { opacity: textOpacity }]}
            >
              <Text style={styles.appName}>BUZZVAR</Text>
              <Text style={styles.tagline}>where vibes meet reality</Text>
            </Animated.View>
          </View>
        </LinearGradient>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
  },
  gradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
  },
  textContainer: {
    alignItems: "center",
  },
  appName: {
    fontSize: 36,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: 4,
    textAlign: "center",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: "#4ecdc4",
    letterSpacing: 1,
    textAlign: "center",
    fontWeight: "400",
    opacity: 0.9,
  },
});

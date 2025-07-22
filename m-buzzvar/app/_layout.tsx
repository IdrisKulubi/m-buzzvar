import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useEffect, useState } from "react";
import { ActivityIndicator, View, Text } from "react-native";

import { useColorScheme } from "@/hooks/useColorScheme";
import { ToastProvider } from "@/src/lib/ToastProvider";
import { AuthProvider, useAuth } from "@/src/lib/auth-provider";
import { checkUserProfile } from "@/src/actions/standalone-actions";
import { Colors } from "@/constants/Colors";

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const [authTimeout, setAuthTimeout] = useState(false);

  useEffect(() => {
    // Deep linking is handled by the standalone auth system
    console.log('🔵 App initialized with standalone auth');
  }, [])

  useEffect(() => {
    // Set a timeout for auth loading to prevent infinite loading
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Auth loading timeout - redirecting to login')
        setAuthTimeout(true)
        router.replace('/login')
      }
    }, 15000) // 15 second timeout

    return () => clearTimeout(timeout)
  }, [loading, router])

  useEffect(() => {
    console.log('🔵 Layout: Navigation effect triggered', {
      loading,
      hasUser: !!user,
      userEmail: user?.email,
      segments: segments,
      currentRoute: segments.join("/")
    });

    // Wait until authentication status is confirmed
    if (loading) {
      console.log('🔵 Layout: Still loading auth, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === "(tabs)";
    const currentRoute = segments.join("/");
    const inProtectedRoute =
      inAuthGroup ||
      currentRoute.includes("edit-profile") ||
      currentRoute.includes("about") ||
      currentRoute.includes("help") ||
      currentRoute.includes("privacy");
    const inPublicRoute =
      currentRoute.includes("login") || currentRoute.includes("setup-profile");
    const inInitialRoute = currentRoute === "" || currentRoute === "index";

    console.log('🔵 Layout: Route analysis', {
      currentRoute,
      inAuthGroup,
      inProtectedRoute,
      inPublicRoute,
      inInitialRoute,
      hasUser: !!user
    });

    if (!user && inProtectedRoute) {
      // Redirect them to the login screen.
      console.log('🔴 Layout: No user on protected route, redirecting to login');
      router.replace("/login");
    } else if (user && (inPublicRoute || inInitialRoute)) {
      // User is signed in but is on a public route or initial route.
      // This occurs after login or on app launch with a valid session.
      // We check for a profile and redirect accordingly.
      console.log('🔵 Layout: User found on public/initial route, checking profile...');
      checkUserProfile(user.id).then(({ hasProfile, error }) => {
        console.log('🔵 Layout: Profile check result', { hasProfile, error: !!error });
        
        if (error) {
          console.error(
            "🔴 Layout: Auth flow error: Could not check profile. Redirecting to login.",
            error
          );
          router.replace("/login");
          return;
        }

        if (hasProfile) {
          console.log('🟢 Layout: User has profile, redirecting to tabs');
          router.replace("/(tabs)");
        } else {
          console.log('🟡 Layout: User needs profile setup, redirecting to setup');
          router.replace("/setup-profile");
        }
      });
    } else if (!user && (inPublicRoute || inInitialRoute)) {
      console.log('🔵 Layout: No user on public/initial route, redirecting to login');
      router.replace("/login");
    } else {
      console.log('🔵 Layout: User authenticated and on correct route, staying put');
    }
    // If user is authenticated and on a protected route, let them stay there
  }, [user, loading, segments, router]);

  // While loading auth state, we can show a spinner.
  // app/index.tsx will handle the initial splash animation.
  if (loading && !authTimeout) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ color: colors.text, marginTop: 16 }}>
          Connecting to server...
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="setup-profile" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
      <Stack.Screen name="about" />
      <Stack.Screen name="edit-profile" />
      <Stack.Screen name="help" />
      <Stack.Screen name="privacy" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ToastProvider>
            <BottomSheetModalProvider>
              <RootLayoutNav />
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            </BottomSheetModalProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

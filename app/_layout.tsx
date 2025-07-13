import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { useColorScheme } from '@/hooks/useColorScheme';
import { ToastProvider } from '@/src/lib/ToastProvider';
import { AuthProvider, useAuth } from '@/src/lib/hooks';
import { checkUserProfile } from '@/src/actions/auth';
import { Colors } from '@/constants/Colors';

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];

  useEffect(() => {
    // Wait until authentication status is confirmed
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';

    if (!user && inAuthGroup) {
      // User is not signed in but is in a protected area.
      // Redirect them to the login screen.
      router.replace('/login');
    } else if (user && !inAuthGroup) {
      // User is signed in but not in the main app routes.
      // This occurs after login or on app launch with a valid session.
      // We check for a profile and redirect accordingly.
      checkUserProfile(user.id).then(({ hasProfile, error }) => {
        if (error) {
          console.error("Auth flow error: Could not check profile. Redirecting to login.", error);
          router.replace('/login');
          return;
        }
        
        if (hasProfile) {
          router.replace('/(tabs)');
        } else {
          router.replace('/setup-profile');
        }
      });
    }
  }, [user, loading, segments]);

  // While loading auth state, we can show a spinner.
  // app/index.tsx will handle the initial splash animation.
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
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
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ToastProvider>
          <BottomSheetModalProvider>
              <RootLayoutNav />
              <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
            </BottomSheetModalProvider>
            </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

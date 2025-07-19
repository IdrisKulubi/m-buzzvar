import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  useColorScheme,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/src/lib/hooks";
import { getUserProfile, signOut } from "@/src/actions/auth";
import Button from "@/src/components/Button";
import ProfileSkeleton from "@/components/skeletons/ProfileSkeleton";

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  university: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? "dark";
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === "dark");

  const loadProfile = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await getUserProfile(user.id);
      if (error) {
        console.error("Error loading profile:", error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleEditProfile = () => {
    console.log("🔵 Profile: Navigating to edit-profile");
    router.push("/edit-profile");
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            setSigningOut(true);
            console.log("🔵 Profile: Starting sign out...");
            const { error } = await signOut();

            if (error) {
              console.error("🔴 Profile: Sign out error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
            } else {
              console.log(
                "🟢 Profile: Sign out successful, navigation will be handled by auth state change"
              );
              console.log(
                "🔵 Profile: Waiting for auth state change to trigger navigation to login..."
              );
              // The useAuth hook will detect the auth state change and redirect to login
              // The main index.tsx will handle the navigation
            }
          } catch (error) {
            console.error("🔴 Profile: Unexpected sign out error:", error);
            Alert.alert(
              "Error",
              "An unexpected error occurred during sign out."
            );
          } finally {
            setSigningOut(false);
          }
        },
      },
    ]);
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Note: In a real app, you'd save this preference to storage
    // and implement a theme context provider
  };

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user, loadProfile]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingBottom: 40,
    },
    // Hero Section Styles
    heroSection: {
      padding: 24,
      alignItems: "center",
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 4,
      borderColor: colors.tint,
      marginBottom: 16,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.tint,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      fontSize: 48,
      fontWeight: "bold",
      color: colors.background,
    },
    profileName: {
      fontSize: 26,
      fontWeight: "bold",
      color: colors.text,
      textAlign: "center",
    },
    profileUniversity: {
      fontSize: 16,
      color: colors.tint,
      textAlign: "center",
      fontWeight: "600",
      marginTop: 4,
    },
    editButton: {
      position: "absolute",
      top: 20,
      right: 20,
      backgroundColor: "rgba(0,0,0,0.3)",
      borderRadius: 20,
      padding: 8,
    },
    // Menu Section Styles
    menuSection: {
      marginTop: 32,
      marginHorizontal: 16,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    menuSectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    menuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuItemContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    menuIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    menuTextContainer: {
      flex: 1,
    },
    menuText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: "600",
    },
    menuSubText: {
      fontSize: 12,
      color: colors.muted,
      marginTop: 2,
    },
    signOutButton: {
      marginHorizontal: 1,
      marginTop: 32,
      marginBottom: 16,
    },
  });

  if (loading) {
    return <ProfileSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Hero Section */}
        <View style={styles.heroSection}>
          <View>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.profileName}>
            {profile?.name || "Anonymous User"}
          </Text>
          {profile?.university && (
            <Text style={styles.profileUniversity}>
              🎓 {profile.university}
            </Text>
          )}

          <TouchableOpacity
            onPress={handleEditProfile}
            style={styles.editButton}
          >
            <Ionicons name="pencil" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Menu Section: Account */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log("🔵 Profile: Navigating to notifications");
              // For now, just show an alert since notifications screen doesn't exist
              Alert.alert(
                "Coming Soon",
                "Notifications settings will be available soon!"
              );
            }}
          >
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIcon, { backgroundColor: colors.tint }]}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={colors.background}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Notifications</Text>
                <Text style={styles.menuSubText}>Manage your alerts</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => {
              console.log("🔵 Profile: Navigating to privacy");
              router.push("/privacy");
            }}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: Colors.semantic.info },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={20} color={"#FFF"} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Privacy & Security</Text>
                <Text style={styles.menuSubText}>Control your data</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Menu Section: Preferences */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Preferences</Text>
          <View style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIcon, { backgroundColor: "#333" }]}>
                <Ionicons
                  name={isDarkMode ? "moon-outline" : "sunny-outline"}
                  size={20}
                  color={"#FFF"}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Dark Mode</Text>
                <Text style={styles.menuSubText}>
                  {isDarkMode ? "Enabled" : "Disabled"}
                </Text>
              </View>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={isDarkMode ? colors.background : colors.surface}
            />
          </View>
        </View>

        {/* Menu Section: Support */}
        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              console.log("🔵 Profile: Navigating to help");
              router.push("/help");
            }}
          >
            <View style={styles.menuItemContent}>
              <View
                style={[
                  styles.menuIcon,
                  { backgroundColor: Colors.semantic.success },
                ]}
              >
                <Ionicons name="help-circle-outline" size={20} color={"#FFF"} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>Help & Support</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.menuItemLast]}
            onPress={() => {
              console.log("🔵 Profile: Navigating to about");
              router.push("/about");
            }}
          >
            <View style={styles.menuItemContent}>
              <View style={[styles.menuIcon, { backgroundColor: "#6B7280" }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={"#FFF"}
                />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuText}>About</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <Button
          title={signingOut ? "Signing Out..." : "Sign Out"}
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          loading={signingOut}
          disabled={signingOut}
          style={styles.signOutButton}
          icon={
            !signingOut && (
              <Ionicons
                name="log-out-outline"
                size={16}
                color={colors.destructive}
              />
            )
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

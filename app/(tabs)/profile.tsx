import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  useColorScheme, 
  ScrollView, 
  TouchableOpacity,
  Alert,
  Image,
  Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/src/lib/hooks';
import { getUserProfile, signOut } from '@/src/actions/auth';
import Button from '@/src/components/Button';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  university: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(colorScheme === 'dark');

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await getUserProfile(user.id);
      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    // Note: In a real app, you'd save this preference to storage
    // and implement a theme context provider
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    header: {
      alignItems: 'center',
      marginBottom: 30,
    },
    title: {
      fontSize: 32,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
    },
    profileCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 24,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    avatarContainer: {
      marginBottom: 16,
    },
    avatar: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
      borderColor: colors.tint,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.tint,
    },
    avatarText: {
      fontSize: 36,
      fontWeight: '700',
      color: colors.background,
    },
    profileName: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 4,
    },
    profileEmail: {
      fontSize: 16,
      color: colors.muted,
      textAlign: 'center',
      marginBottom: 8,
    },
    profileUniversity: {
      fontSize: 16,
      color: colors.tint,
      textAlign: 'center',
      fontWeight: '600',
    },
    editButton: {
      marginTop: 16,
    },
    settingsCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    settingsTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    settingItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    settingItemLast: {
      borderBottomWidth: 0,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingIcon: {
      marginRight: 12,
    },
    settingText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    menuCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    menuTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    menuItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    menuItemLast: {
      borderBottomWidth: 0,
    },
    menuLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    menuIcon: {
      marginRight: 12,
    },
    menuText: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '500',
    },
    signOutButton: {
      marginTop: 20,
      marginBottom: 40,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      fontSize: 16,
      color: colors.muted,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <Text style={styles.subtitle}>Manage your account and preferences</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
          </View>
          
          <Text style={styles.profileName}>
            {profile?.name || 'Anonymous User'}
          </Text>
          <Text style={styles.profileEmail}>{profile?.email}</Text>
          {profile?.university && (
            <Text style={styles.profileUniversity}>
              🎓 {profile.university}
            </Text>
          )}
          
          <Button
            title="Edit Profile"
            onPress={handleEditProfile}
            variant="primary"
            size="medium"
            style={styles.editButton}
            icon={<Ionicons name="pencil" size={16} color={colors.background} />}
          />
        </View>

        {/* Settings */}
        <View style={styles.settingsCard}>
          <Text style={styles.settingsTitle}>Preferences</Text>
          
          <View style={[styles.settingItem, styles.settingItemLast]}>
            <View style={styles.settingLeft}>
              <Ionicons 
                name={isDarkMode ? 'moon' : 'sunny'} 
                size={20} 
                color={colors.tint} 
                style={styles.settingIcon}
              />
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: colors.border, true: colors.tint }}
              thumbColor={isDarkMode ? colors.background : colors.surface}
            />
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuCard}>
          <Text style={styles.menuTitle}>Account</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons 
                name="notifications-outline" 
                size={20} 
                color={colors.tint} 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons 
                name="lock-closed-outline" 
                size={20} 
                color={colors.tint} 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Privacy & Security</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Ionicons 
                name="help-circle-outline" 
                size={20} 
                color={colors.tint} 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, styles.menuItemLast]}>
            <View style={styles.menuLeft}>
              <Ionicons 
                name="information-circle-outline" 
                size={20} 
                color={colors.tint} 
                style={styles.menuIcon}
              />
              <Text style={styles.menuText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.muted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          variant="outline"
          fullWidth
          style={styles.signOutButton}
          icon={<Ionicons name="log-out-outline" size={16} color={colors.tint} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
} 
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/src/lib/hooks';
import { getUserProfile, updateUserProfile } from '@/src/actions/auth';
import Button from '@/src/components/Button';
import Input from '@/src/components/Input';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  university: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function EditProfileScreen() {
  const colorScheme = useColorScheme() ?? 'dark';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [university, setUniversity] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  
  // Validation state
  const [nameError, setNameError] = useState('');
  const [universityError, setUniversityError] = useState('');

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await getUserProfile(user.id);
      if (error) {
        console.error('Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile data');
      } else {
        setProfile(data);
        setName(data?.name || '');
        setUniversity(data?.university || '');
        setAvatarUri(data?.avatar_url);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    
    // Reset errors
    setNameError('');
    setUniversityError('');
    
    // Validate name
    if (!name.trim()) {
      setNameError('Name is required');
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      isValid = false;
    }
    
    // University is optional, but if provided, validate it
    if (university.trim() && university.trim().length < 2) {
      setUniversityError('University name must be at least 2 characters');
      isValid = false;
    }
    
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user) return;

    setSaving(true);
    
    try {
      const { error } = await updateUserProfile(user.id, {
        name: name.trim(),
        university: university.trim() || null,
        avatar_url: avatarUri,
      });

      if (error) {
        console.error('Error updating profile:', error);
        Alert.alert('Error', 'Failed to update profile. Please try again.');
      } else {
        Alert.alert(
          'Success',
          'Profile updated successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleImagePicker = async () => {
    try {
      // Request permission
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to update your profile picture.'
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => setAvatarUri(null),
        },
      ]
    );
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      marginRight: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
    },
    avatarSection: {
      alignItems: 'center',
      marginBottom: 32,
    },
    avatarContainer: {
      position: 'relative',
      marginBottom: 16,
    },
    avatar: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: colors.tint,
    },
    avatarPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.tint,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.tint,
    },
    avatarText: {
      fontSize: 48,
      fontWeight: '700',
      color: colors.background,
    },
    avatarOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.tint,
      borderRadius: 20,
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.background,
    },
    avatarButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    avatarButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.tint,
    },
    avatarButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.tint,
    },
    removeButton: {
      backgroundColor: colors.destructive,
      borderColor: colors.destructive,
    },
    removeButtonText: {
      color: colors.background,
    },
    formSection: {
      gap: 20,
      marginBottom: 32,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    required: {
      color: colors.destructive,
    },
    saveButton: {
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
      marginTop: 12,
    },
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Ionicons name="person-circle" size={64} color={colors.muted} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {name?.charAt(0)?.toUpperCase() || 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.avatarOverlay}
                onPress={handleImagePicker}
              >
                <Ionicons name="camera" size={20} color={colors.background} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.avatarButtons}>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={handleImagePicker}
              >
                <Text style={styles.avatarButtonText}>Change Photo</Text>
              </TouchableOpacity>
              
              {avatarUri && (
                <TouchableOpacity
                  style={[styles.avatarButton, styles.removeButton]}
                  onPress={handleRemoveImage}
                >
                  <Text style={[styles.avatarButtonText, styles.removeButtonText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Full Name <Text style={styles.required}>*</Text>
              </Text>
              <Input
                placeholder="Enter your full name"
                value={name}
                onChangeText={setName}
                error={nameError}
                autoCapitalize="words"
                autoComplete="name"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>University</Text>
              <Input
                placeholder="Enter your university (optional)"
                value={university}
                onChangeText={setUniversity}
                error={universityError}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <Input
                placeholder="Email address"
                value={profile?.email || ''}
                editable={false}
                style={{ opacity: 0.6 }}
              />
              <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>
                Email cannot be changed
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <Button
            title={saving ? "Saving..." : "Save Changes"}
            onPress={handleSave}
            variant="primary"
            fullWidth
            disabled={saving}
            style={styles.saveButton}
            icon={
              saving ? (
                <Ionicons name="hourglass" size={16} color={colors.background} />
              ) : (
                <Ionicons name="checkmark" size={16} color={colors.background} />
              )
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 
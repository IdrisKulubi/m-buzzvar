import { supabase } from '../lib/supabase'
import * as AuthSession from 'expo-auth-session'
import * as WebBrowser from 'expo-web-browser'
import { Platform } from 'react-native'

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession()

export interface UserProfileData {
  id: string
  email: string
  name: string
  university?: string | null
  avatar_url?: string | null
}

// Sign in with Google OAuth
export async function signInWithGoogle() {
  try {
    console.log('🔵 Starting Google OAuth flow...');
    
    const redirectUrl = AuthSession.makeRedirectUri({
      useProxy: true,
    } as any);
    console.log('🔵 Redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      console.error('🔴 Supabase OAuth error:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('🔵 OAuth data received:', JSON.stringify(data, null, 2));

    // Open the OAuth URL
    if (data.url) {
      console.log('🔵 Opening OAuth URL:', data.url);
      
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log('🔵 WebBrowser result:', JSON.stringify(result, null, 2));

      if (result.type === 'success') {
        console.log('🟢 OAuth redirect successful');
        
        // Handle the redirect URL
        const { url } = result;
        console.log('🔵 Redirect URL received:', url);
        
        const parsedUrl = new URL(url);
        console.log('🔵 Parsed URL pathname:', parsedUrl.pathname);
        console.log('🔵 Parsed URL search params:', parsedUrl.search);
        console.log('🔵 Parsed URL fragment:', parsedUrl.hash);
        
        // Parse the fragment (after #) instead of search params
        let accessToken: string | null = null;
        let refreshToken: string | null = null;
        let error: string | null = null;
        let errorDescription: string | null = null;

        if (parsedUrl.hash) {
          // Remove the # and parse as URLSearchParams
          const fragmentParams = new URLSearchParams(parsedUrl.hash.substring(1));
          accessToken = fragmentParams.get('access_token');
          refreshToken = fragmentParams.get('refresh_token');
          error = fragmentParams.get('error');
          errorDescription = fragmentParams.get('error_description');
          
          console.log('🔵 Fragment params found:', Array.from(fragmentParams.entries()));
        } else {
          // Fallback to search params if no fragment
          accessToken = parsedUrl.searchParams.get('access_token');
          refreshToken = parsedUrl.searchParams.get('refresh_token');
          error = parsedUrl.searchParams.get('error');
          errorDescription = parsedUrl.searchParams.get('error_description');
          
          console.log('🔵 Search params found:', Array.from(parsedUrl.searchParams.entries()));
        }

        console.log('🔵 Access token present:', !!accessToken);
        console.log('🔵 Refresh token present:', !!refreshToken);
        console.log('🔵 Error in URL:', error);
        console.log('🔵 Error description:', errorDescription);

        if (error) {
          console.error('🔴 OAuth error in redirect URL:', error, errorDescription);
          throw new Error(`OAuth error: ${error} - ${errorDescription}`);
        }

        if (accessToken && refreshToken) {
          console.log('🟢 Tokens found, setting session...');
          
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error('🔴 Session error:', JSON.stringify(sessionError, null, 2));
            throw sessionError;
          }

          console.log('🟢 Session set successfully');
          console.log('🔵 Session user:', sessionData.user?.email);
          
          return { data: sessionData, error: null };
        } else {
          console.error('🔴 Missing tokens in redirect URL');
          console.log('🔵 Fragment params:', parsedUrl.hash ? Array.from(new URLSearchParams(parsedUrl.hash.substring(1)).entries()) : 'No fragment');
          console.log('🔵 Search params:', Array.from(parsedUrl.searchParams.entries()));
          throw new Error('Missing access_token or refresh_token in redirect URL');
        }
      } else if (result.type === 'cancel') {
        console.log('🟡 User cancelled OAuth flow');
        throw new Error('User cancelled the authentication');
      } else if (result.type === 'dismiss') {
        console.log('🟡 OAuth flow was dismissed');
        throw new Error('Authentication was dismissed');
      } else {
        console.error('🔴 Unexpected WebBrowser result type:', result.type);
        throw new Error(`Unexpected result type: ${result.type}`);
      }
    } else {
      console.error('🔴 No OAuth URL received from Supabase');
      throw new Error('No OAuth URL received from Supabase');
    }
  } catch (error) {
    console.error('🔴 Full OAuth error:', JSON.stringify(error, null, 2));
    return { data: null, error };
  }
}

// Create user profile
export async function createUserProfile(profileData: UserProfileData) {
  try {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: profileData.id,
        email: profileData.email,
        name: profileData.name,
        university: profileData.university,
        avatar_url: profileData.avatar_url,
      })
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Check if user has profile
export async function checkUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist
      return { hasProfile: false, error: null }
    }

    if (error) throw error
    return { hasProfile: true, error: null }
  } catch (error) {
    return { hasProfile: false, error }
  }
}

// Get current user profile
export async function getUserProfile(userId: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<Pick<UserProfileData, 'name' | 'university' | 'avatar_url'>>) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Sign in with email/password
export async function signIn({ email, password }: { email: string; password: string }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Sign up with email/password
export async function signUp({ email, password, name }: { email: string; password: string; name: string }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })
    if (error) throw error
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

// Reset password
export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
    return { error: null }
  } catch (error) {
    return { error }
  }
}

// Sign out
export async function signOut() {
  try {
    console.log('🔵 Auth: Starting sign out process...');
    
    // Clear the session from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('🔴 Auth: Sign out error:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    console.log('🟢 Auth: Sign out successful - session cleared');
    console.log('🔵 Auth: Auth state change should trigger navigation to login');
    return { error: null };
  } catch (error) {
    console.error('🔴 Auth: Sign out failed:', JSON.stringify(error, null, 2));
    return { error };
  }
} 
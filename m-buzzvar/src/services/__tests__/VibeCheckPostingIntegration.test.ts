/**
 * Integration tests for the complete vibe check posting flow
 * Tests the interaction between all services and components
 */

import { VibeCheckService } from '../VibeCheckService';
import { LocationVerificationService } from '../LocationVerificationService';
import { PhotoUploadService } from '../PhotoUploadService';
import { supabase } from '../../lib/supabase';
import { ErrorFactory } from '../../lib/errors';
import * as Location from 'expo-location';

// Mock external dependencies
jest.mock('../../lib/supabase');
jest.mock('expo-location');
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockLocation = Location as jest.Mocked<typeof Location>;

describe('Vibe Check Postin
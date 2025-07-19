// Mock expo modules
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children, ...props }) => children,
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, ...props }) => children,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  Feather: 'Feather',
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
  },
  useFocusEffect: jest.fn(),
}));

// Mock @gorhom/bottom-sheet
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetModal: 'BottomSheetModal',
  BottomSheetScrollView: 'BottomSheetScrollView',
}));

global.__DEV__ = true;
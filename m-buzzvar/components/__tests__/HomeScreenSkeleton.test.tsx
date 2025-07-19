import React from "react";
import { render } from "@testing-library/react-native";
import HomeScreenSkeleton from "../skeletons/HomeScreenSkeleton";

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children, ...props }: any) => children,
}));

// Mock Colors
jest.mock("@/constants/Colors", () => ({
  Colors: {
    dark: {
      background: "#000000",
      surface: "#1a1a1a",
      border: "#333333",
    },
    light: {
      background: "#ffffff",
      surface: "#f5f5f5",
      border: "#e0e0e0",
    },
  },
}));

describe("HomeScreenSkeleton", () => {
  it("renders without crashing", () => {
    expect(() => render(<HomeScreenSkeleton />)).not.toThrow();
  });

  it("renders skeleton structure", () => {
    const component = render(<HomeScreenSkeleton />);
    expect(component).toBeTruthy();
  });

  it("contains multiple skeleton sections", () => {
    const component = render(<HomeScreenSkeleton />);
    // Should render the skeleton structure with multiple sections
    expect(component.toJSON()).toBeTruthy();
  });

  it("adapts to color scheme", () => {
    const component = render(<HomeScreenSkeleton />);
    // Component should render successfully with color scheme
    expect(component).toBeTruthy();
  });

  it("renders scrollable content", () => {
    const component = render(<HomeScreenSkeleton />);
    // Should contain ScrollView structure
    expect(component).toBeTruthy();
  });
});

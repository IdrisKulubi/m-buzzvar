/**
 * Tests for error handling utilities
 */

import {
  ErrorType,
  ErrorSeverity,
  ErrorFactory,
 
} from "../errors";

describe("ErrorFactory", () => {
  describe("Location Errors", () => {
    it("should create location permission denied error", () => {
      const error = ErrorFactory.locationPermissionDenied();

      expect(error.type).toBe(ErrorType.LOCATION_PERMISSION_DENIED);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.actionable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain("Location access is required");
      expect(error.metadata?.action).toContain("device settings");
    });

    it("should create location services disabled error", () => {
      const error = ErrorFactory.locationServicesDisabled();

      expect(error.type).toBe(ErrorType.LOCATION_SERVICES_DISABLED);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.actionable).toBe(true);
      expect(error.retryable).toBe(true);
      expect(error.userMessage).toContain("Location services are disabled");
      expect(error.metadata?.action).toContain("enable location services");
    });
  });
});

/**
 * Error Display component for showing inline error messages
 * with appropriate styling and action buttons
 */

import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { AppError, ErrorSeverity } from '@/src/lib/errors';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
  style?: any;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
  compact = false,
  style,
}) => {
  const getErrorColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return Colors.semantic.warning;
      case ErrorSeverity.MEDIUM:
        return Colors.semantic.error;
      case ErrorSeverity.HIGH:
        return Colors.semantic.error;
      case ErrorSeverity.CRITICAL:
        return Colors.semantic.error;
      default:
        return Colors.semantic.error;
    }
  };

  const getErrorIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'warning-outline';
      case ErrorSeverity.MEDIUM:
        return 'alert-circle-outline';
      case ErrorSeverity.HIGH:
        return 'close-circle-outline';
      case ErrorSeverity.CRITICAL:
        return 'skull-outline';
      default:
        return 'alert-circle-outline';
    }
  };

  const errorColor = getErrorColor(error.severity);
  const errorIcon = getErrorIcon(error.severity);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderColor: errorColor }, style]}>
        <Ionicons name={errorIcon} size={16} color={errorColor} />
        <ThemedText style={[styles.compactMessage, { color: errorColor }]}>
          {error.userMessage}
        </ThemedText>
        {error.retryable && onRetry && (
          <TouchableOpacity
            style={styles.compactRetryButton}
            onPress={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={errorColor} />
            ) : (
              <Ionicons name="refresh" size={16} color={errorColor} />
            )}
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity
            style={styles.compactDismissButton}
            onPress={onDismiss}
          >
            <Ionicons name="close" size={16} color={Colors.light.muted} />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: `${errorColor}10` }, style]}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={errorIcon} size={24} color={errorColor} />
        </View>
        <View style={styles.messageContainer}>
          <ThemedText style={[styles.message, { color: errorColor }]}>
            {error.userMessage}
          </ThemedText>
          {error.metadata?.action && (
            <ThemedText style={styles.actionHint}>
              {error.metadata.action}
            </ThemedText>
          )}
        </View>
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={onDismiss}
          >
            <Ionicons name="close" size={20} color={Colors.light.muted} />
          </TouchableOpacity>
        )}
      </View>

      {(error.retryable && onRetry) && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.retryButton, { borderColor: errorColor }]}
            onPress={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? (
              <>
                <ActivityIndicator size="small" color={errorColor} />
                <ThemedText style={[styles.retryButtonText, { color: errorColor }]}>
                  Retrying...
                </ThemedText>
              </>
            ) : (
              <>
                <Ionicons name="refresh" size={16} color={errorColor} />
                <ThemedText style={[styles.retryButtonText, { color: errorColor }]}>
                  Try Again
                </ThemedText>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginBottom: 4,
  },
  compactMessage: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  actionHint: {
    fontSize: 12,
    color: Colors.light.muted,
    lineHeight: 16,
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  compactDismissButton: {
    padding: 4,
  },
  compactRetryButton: {
    padding: 4,
  },
  actionContainer: {
    marginTop: 12,
    flexDirection: 'row',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default ErrorDisplay;
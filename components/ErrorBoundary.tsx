/**
 * Error Boundary component for catching and displaying React errors
 * with user-friendly error messages and recovery options
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { ErrorFactory, AppError, ErrorType } from '@/src/lib/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
  errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Convert the error to our AppError format
    const appError = ErrorFactory.unknownError(error);
    
    return {
      hasError: true,
      error: appError,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const appError = ErrorFactory.unknownError(error);
    
    this.setState({
      errorInfo,
    });

    // Call the onError callback if provided
    this.props.onError?.(appError, errorInfo);

    // Log error for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error UI
      return (
        <ThemedView style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.errorContainer}>
              <View style={[styles.iconContainer, { backgroundColor: Colors.light.surface }]}>
                <Ionicons 
                  name="alert-circle-outline" 
                  size={64} 
                  color={Colors.semantic.error} 
                />
              </View>

              <ThemedText type="title" style={styles.title}>
                Oops! Something went wrong
              </ThemedText>

              <ThemedText style={styles.message}>
                {this.state.error.userMessage}
              </ThemedText>

              {this.state.error.metadata?.action && (
                <View style={styles.actionContainer}>
                  <ThemedText style={styles.actionLabel}>
                    What you can do:
                  </ThemedText>
                  <ThemedText style={styles.actionText}>
                    {this.state.error.metadata.action}
                  </ThemedText>
                </View>
              )}

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                >
                  <Ionicons 
                    name="refresh" 
                    size={20} 
                    color={Colors.light.background} 
                  />
                  <ThemedText style={styles.retryButtonText}>
                    Try Again
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {__DEV__ && (
                <View style={styles.debugContainer}>
                  <ThemedText style={styles.debugTitle}>
                    Debug Info (Development Only)
                  </ThemedText>
                  <ThemedText style={styles.debugText}>
                    Type: {this.state.error.type}
                  </ThemedText>
                  <ThemedText style={styles.debugText}>
                    Message: {this.state.error.message}
                  </ThemedText>
                  {this.state.errorInfo?.componentStack && (
                    <ThemedText style={styles.debugText}>
                      Stack: {this.state.errorInfo.componentStack}
                    </ThemedText>
                  )}
                </View>
              )}
            </View>
          </ScrollView>
        </ThemedView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    alignItems: 'center',
    maxWidth: 400,
    alignSelf: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
    color: Colors.light.text,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    color: Colors.light.muted,
  },
  actionContainer: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.light.text,
  },
  actionText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.light.muted,
  },
  buttonContainer: {
    width: '100%',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.tint,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.background,
  },
  debugContainer: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.semantic.warning,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
    marginBottom: 4,
    color: Colors.light.muted,
  },
});

export default ErrorBoundary;
import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
  useColorScheme,
} from 'react-native'
import { Colors } from '../../constants/Colors'

interface ButtonProps extends TouchableOpacityProps {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'google'
  size?: 'small' | 'medium' | 'large'
  loading?: boolean
  disabled?: boolean
  icon?: React.ReactNode
  fullWidth?: boolean
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme() ?? 'dark' // Default to dark for premium look
  const colors = Colors[colorScheme]

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16, // More rounded for premium look
      opacity: disabled || loading ? 0.6 : 1,
    }

    // Size styles
    const sizeStyles: Record<string, ViewStyle> = {
      small: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 40 },
      medium: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 52 },
      large: { paddingHorizontal: 32, paddingVertical: 18, minHeight: 60 },
    }

    // Variant styles with new color scheme
    const variantStyles: Record<string, ViewStyle> = {
      primary: { 
        backgroundColor: colors.tint, // Primary gold
        shadowColor: colors.tint,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
      },
      secondary: { 
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      },
      outline: { 
        backgroundColor: 'transparent', 
        borderWidth: 2, 
        borderColor: colors.tint,
      },
      google: { 
        backgroundColor: colorScheme === 'dark' ? '#ffffff' : '#ffffff',
        borderWidth: 1, 
        borderColor: colorScheme === 'dark' ? '#e5e7eb' : '#e5e7eb',
        shadowColor: colorScheme === 'dark' ? colors.tint : '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: colorScheme === 'dark' ? 0.3 : 0.15,
        shadowRadius: 8,
        elevation: 8,
      },
    }

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
      ...(fullWidth && { width: '100%' }),
    }
  }

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    }

    // Size styles
    const sizeStyles: Record<string, TextStyle> = {
      small: { fontSize: 14 },
      medium: { fontSize: 16 },
      large: { fontSize: 18 },
    }

    // Variant styles with new color scheme
    const variantStyles: Record<string, TextStyle> = {
      primary: { color: colorScheme === 'dark' ? colors.background : colors.background },
      secondary: { color: colors.text },
      outline: { color: colors.tint },
      google: { color: '#374151' },
    }

    return {
      ...baseStyle,
      ...sizeStyles[size],
      ...variantStyles[variant],
    }
  }

  const getLoadingColor = () => {
    switch (variant) {
      case 'primary':
        return colorScheme === 'dark' ? colors.background : colors.background
      case 'outline':
        return colors.tint
      default:
        return colors.text
    }
  }

  return (
    <TouchableOpacity
      style={[getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={getLoadingColor()}
          size="small"
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[getTextStyle(), icon && { marginLeft: 8 } as any]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
} 
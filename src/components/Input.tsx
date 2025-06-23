import React, { useState } from 'react'
import {
  TextInput,
  View,
  Text,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  TextStyle,
  useColorScheme,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/Colors'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  leftIcon?: keyof typeof Ionicons.glyphMap
  rightIcon?: keyof typeof Ionicons.glyphMap
  onRightIconPress?: () => void
  containerStyle?: ViewStyle
  inputStyle?: ViewStyle
  labelStyle?: TextStyle
  errorStyle?: TextStyle
}

export default function Input({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  secureTextEntry,
  ...props
}: InputProps) {
  const [isSecure, setIsSecure] = useState(secureTextEntry)
  const [isFocused, setIsFocused] = useState(false)
  const colorScheme = useColorScheme() ?? 'dark' // Default to dark for premium look
  const colors = Colors[colorScheme]

  const getContainerStyle = (): ViewStyle => ({
    marginBottom: 20, // Increased spacing for premium look
  })

  const getLabelStyle = (): TextStyle => ({
    fontSize: 15,
    fontWeight: '600',
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    marginBottom: 10,
    letterSpacing: 0.3, // Subtle letter spacing for premium feel
  })

  const getInputContainerStyle = (): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: error 
      ? Colors.semantic.error 
      : isFocused 
        ? 'oklch(0.83 0.1 83.77)' 
        : colorScheme === 'dark' ? '#333333' : '#e5e7eb',
    borderRadius: 16, // More rounded for premium look
    backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#ffffff',
    paddingHorizontal: 18, // Slightly more padding
    minHeight: 56, // Taller for better touch targets
    shadowColor: isFocused ? 'oklch(0.83 0.1 83.77)' : 'transparent',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isFocused ? 0.15 : 0,
    shadowRadius: 8,
    elevation: isFocused ? 4 : 0,
  })

  const getInputStyle = (): TextStyle => ({
    flex: 1,
    fontSize: 16,
    color: colorScheme === 'dark' ? '#ffffff' : '#000000',
    paddingVertical: 16,
    letterSpacing: 0.2,
  })

  const getErrorStyle = (): TextStyle => ({
    fontSize: 13,
    color: Colors.semantic.error,
    marginTop: 6,
    fontWeight: '500',
  })

  const getIconColor = () => {
    if (error) return Colors.semantic.error
    if (isFocused) return 'oklch(0.83 0.1 83.77)'
    return colorScheme === 'dark' ? '#888888' : '#999999'
  }

  const getPlaceholderColor = () => {
    return colorScheme === 'dark' ? '#888888' : '#999999'
  }

  const handleToggleSecure = () => {
    setIsSecure(!isSecure)
  }

  return (
    <View style={[getContainerStyle(), containerStyle]}>
      {label && (
        <Text style={[getLabelStyle(), labelStyle]}>
          {label}
        </Text>
      )}
      
      <View style={getInputContainerStyle()}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={22}
            color={getIconColor()}
            style={{ marginRight: 14 }}
          />
        )}
        
        <TextInput
          style={[getInputStyle(), inputStyle]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor={getPlaceholderColor()}
          selectionColor="oklch(0.83 0.1 83.77)"
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity onPress={handleToggleSecure} activeOpacity={0.7}>
            <Ionicons
              name={isSecure ? 'eye-off' : 'eye'}
              size={22}
              color={getIconColor()}
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress} activeOpacity={0.7}>
            <Ionicons
              name={rightIcon}
              size={22}
              color={getIconColor()}
              style={{ marginLeft: 14 }}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={[getErrorStyle(), errorStyle]}>
          {error}
        </Text>
      )}
    </View>
  )
} 
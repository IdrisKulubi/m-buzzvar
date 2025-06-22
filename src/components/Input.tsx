import React, { useState } from 'react'
import {
  TextInput,
  View,
  Text,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'

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

  const getContainerStyle = (): ViewStyle => ({
    marginBottom: 16,
  })

  const getLabelStyle = (): TextStyle => ({
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  })

  const getInputContainerStyle = (): ViewStyle => ({
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: error ? '#ef4444' : isFocused ? '#ef4444' : '#e5e7eb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    minHeight: 48,
  })

  const getInputStyle = (): TextStyle => ({
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 12,
  })

  const getErrorStyle = (): TextStyle => ({
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  })

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
            size={20}
            color="#9ca3af"
            style={{ marginRight: 12 }}
          />
        )}
        
        <TextInput
          style={[getInputStyle(), inputStyle]}
          secureTextEntry={isSecure}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        
        {secureTextEntry && (
          <TouchableOpacity onPress={handleToggleSecure}>
            <Ionicons
              name={isSecure ? 'eye-off' : 'eye'}
              size={20}
              color="#9ca3af"
            />
          </TouchableOpacity>
        )}
        
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity onPress={onRightIconPress}>
            <Ionicons
              name={rightIcon}
              size={20}
              color="#9ca3af"
              style={{ marginLeft: 12 }}
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
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/auth-context';

export default function MobileOtpScreen() {
  const router = useRouter();
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();

  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [phone, setPhone] = useState('+91');
  const [token, setToken] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setErrorMessage('Please enter a valid phone number with country code');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    const res = await sendPhoneOtp({ phone });
    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSuccessMessage(`OTP sent to ${phone}`);
      setStep('verify');
    }
  };

  const handleVerifyOtp = async () => {
    if (!token || token.length < 4) {
      setErrorMessage('Please enter the verification code');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const res = await verifyPhoneOtp({ phone, token });
    setIsSubmitting(false);

    if (res.error) {
      setErrorMessage(res.error);
    } else {
      router.replace('/profile');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Phone Sign-In</Text>
        <Text style={styles.subtitle}>
          {step === 'send'
            ? 'Enter your mobile number to receive an SMS verification code'
            : `Enter the code sent to ${phone}`}
        </Text>

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {successMessage && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        )}

        {step === 'send' ? (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+919876543210"
              placeholderTextColor="#9ca3af"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleSendOtp}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Send OTP Code</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formGroup}>
            <Text style={styles.label}>6-Digit OTP Code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor="#9ca3af"
              value={token}
              onChangeText={setToken}
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={handleVerifyOtp}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify & Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setStep('send');
                setToken('');
              }}
            >
              <Text style={styles.backButtonText}>← Change phone number</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={styles.footerText}>
            Prefer email sign-in? <Text style={styles.footerHighlight}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e7e5e4',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  successContainer: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#15803d',
    fontSize: 13,
  },
  formGroup: {
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#44403c',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#1c1917',
    backgroundColor: '#ffffff',
  },
  otpInput: {
    textAlign: 'center',
    fontSize: 20,
    letterSpacing: 8,
  },
  primaryButton: {
    height: 48,
    backgroundColor: '#ea580c',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#ea580c',
    fontSize: 13,
    fontWeight: '500',
  },
  footerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  footerText: {
    color: '#78716c',
    fontSize: 13,
  },
  footerHighlight: {
    color: '#ea580c',
    fontWeight: '600',
  },
});

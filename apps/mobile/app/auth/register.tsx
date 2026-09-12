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
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/auth-context';
import { UserRole } from '@paridhan/types';

export default function MobileRegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('CONSUMER');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      setErrorMsg('Please fill in all required fields');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    const res = await register({
      fullName,
      email,
      password,
      phone: phone.trim() ? phone.trim() : null,
      role,
    });
    setIsSubmitting(false);

    if (res.error) {
      setErrorMsg(res.error);
    } else {
      router.replace('/auth/login');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join PARIDHAN hyper-local fashion marketplace</Text>
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>ROLE</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleOption, role === 'CONSUMER' && styles.roleActive]}
              onPress={() => setRole('CONSUMER')}
            >
              <Text style={[styles.roleText, role === 'CONSUMER' && styles.roleTextActive]}>
                Shopper
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleOption, role === 'SELLER' && styles.roleActive]}
              onPress={() => setRole('SELLER')}
            >
              <Text style={[styles.roleText, role === 'SELLER' && styles.roleTextActive]}>
                Clothing Seller
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            style={styles.input}
            placeholder="Priya Sharma"
            placeholderTextColor="#a8a29e"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>EMAIL ADDRESS</Text>
          <TextInput
            style={styles.input}
            placeholder="priya@example.com"
            placeholderTextColor="#a8a29e"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>PHONE (OPTIONAL)</Text>
          <TextInput
            style={styles.input}
            placeholder="+919876543210"
            placeholderTextColor="#a8a29e"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>PASSWORD</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 8 characters"
            placeholderTextColor="#a8a29e"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleRegister}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Register</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.switchButtonText}>
              Already have an account? <Text style={styles.switchBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafaf9',
  },
  scrollContent: {
    padding: 24,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 13,
    color: '#78716c',
    marginTop: 4,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 13,
  },
  form: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e7e5e4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d6d3d1',
    backgroundColor: '#fafaf9',
  },
  roleActive: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78716c',
  },
  roleTextActive: {
    color: '#ea580c',
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#57534e',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d6d3d1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1c1917',
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: '#ea580c',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: 18,
    alignItems: 'center',
  },
  switchButtonText: {
    fontSize: 13,
    color: '#78716c',
  },
  switchBold: {
    color: '#ea580c',
    fontWeight: '700',
  },
});

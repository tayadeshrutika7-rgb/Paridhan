import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../src/context/auth-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#ea580c',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'PARIDHAN',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            title: 'Sign In',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            title: 'Create Account',
            headerShown: true,
          }}
        />
        <Stack.Screen
          name="profile/index"
          options={{
            title: 'My Profile',
            headerShown: true,
          }}
        />
      </Stack>
    </AuthProvider>
  );
}

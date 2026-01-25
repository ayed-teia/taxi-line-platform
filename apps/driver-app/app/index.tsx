import React from 'react';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store';
import { LoadingScreen } from '../src/ui';
import { LoginScreen } from '../src/features/auth';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingScreen message="Starting Taxi Line Driver..." />;
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLogin={() => {
          // TODO: Implement phone auth flow
          console.log('Login pressed - phone auth will be implemented');
        }}
      />
    );
  }

  // User is authenticated, redirect to home
  return <Redirect href="/home" />;
}

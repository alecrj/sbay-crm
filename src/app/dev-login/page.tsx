'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function DevLoginPage() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if we're in development
    if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
      router.push('/login');
    }
  }, [router]);

  const createAndSignIn = async () => {
    setLoading(true);
    setMessage('Setting up admin account...');

    try {
      const email = '99alecrodriguez@gmail.com';
      const password = 'admin123!@#';

      // First try to sign up
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      let user = signUpData?.user;

      // If signup failed because user exists, try to sign in
      if (signUpError && signUpError.message.includes('already registered')) {
        setMessage('Account exists, signing in...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        user = signInData.user;
      } else if (signUpError) {
        throw signUpError;
      }

      if (!user) {
        throw new Error('No user data received');
      }

      setMessage('Adding admin role...');

      // Add/update user in users table
      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          name: 'Alec Rodriguez',
          role: 'admin',
        }, {
          onConflict: 'id'
        });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        setMessage('Admin role added with some warnings, but you should be able to proceed.');
      } else {
        setMessage('Success! You are now signed in as admin.');
      }

      // Wait a moment then redirect
      setTimeout(() => {
        router.push('/');
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Only show on localhost
  if (typeof window !== 'undefined' && !window.location.href.includes('localhost')) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            🛠️ Development Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Local development admin setup
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-xs text-yellow-700">
              ⚠️ This page only works on localhost for development
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Account Setup</h3>

            <div className="space-y-2 text-sm text-gray-600 mb-4">
              <p>• Email: 99alecrodriguez@gmail.com</p>
              <p>• Password: admin123!@#</p>
              <p>• Role: admin</p>
            </div>

            <button
              onClick={createAndSignIn}
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Setting up...' : '🚀 Create Admin & Sign In'}
            </button>
          </div>

          {message && (
            <div className={`p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div className="text-center space-y-2">
            <a
              href="/login"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to normal login
            </a>
            <p className="text-xs text-gray-500">
              Once signed in, you can invite other users through the admin panel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
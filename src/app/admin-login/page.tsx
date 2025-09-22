'use client';

import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('99alecrodriguez@gmail.com');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  const createAdminAccount = async () => {
    setLoading(true);
    setMessage('');

    try {
      // Try to create user with email/password
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: 'admin123!@#', // Temporary password
      });

      if (signUpError && !signUpError.message.includes('already registered')) {
        throw signUpError;
      }

      let userId = signUpData?.user?.id;

      // If user already exists, get their ID
      if (!userId) {
        const { data: existingUser } = await supabase.auth.signInWithPassword({
          email: email,
          password: 'admin123!@#',
        });
        userId = existingUser.user?.id;
      }

      // Add to users table with admin role
      const { error: insertError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          name: 'Alec Rodriguez',
          role: 'admin',
        });

      if (insertError) {
        console.error('Insert error:', insertError);
      }

      setMessage('Admin account ready! Now try signing in below.');
    } catch (error) {
      console.error('Error:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const signInDirectly = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: 'admin123!@#',
      });

      if (error) throw error;

      setMessage('Signed in successfully! Redirecting...');
      setTimeout(() => router.push('/'), 1000);
    } catch (error) {
      console.error('Sign in error:', error);
      setMessage(`Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Admin Setup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Live site admin access - Use this while OAuth is being configured
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            onClick={createAdminAccount}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : '1. Create Admin Account'}
          </button>

          <button
            onClick={signInDirectly}
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : '2. Sign In as Admin'}
          </button>

          {message && (
            <div className={`p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
              {message}
            </div>
          )}

          <div className="text-center">
            <a
              href="/login"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to normal login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
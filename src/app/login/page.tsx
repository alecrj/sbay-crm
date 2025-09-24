'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordSetup, setIsPasswordSetup] = useState(false);
  const { user, signIn, signUp, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    // Check URL parameters for password setup flows FIRST
    if (searchParams) {
      const error = searchParams.get('error');
      const type = searchParams.get('type');
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      // Handle invitation flows
      if (type === 'invite' || type === 'signup' || (accessToken && refreshToken)) {
        setIsPasswordSetup(true);
        setMessage('Welcome! Please set your password to complete your account setup.');
        return;
      }

      // Handle password reset flows
      if (type === 'recovery') {
        setIsPasswordSetup(true);
        setMessage('Please enter your new password.');
        return;
      }

      // Handle expired links
      if (error) {
        const errorDescription = searchParams.get('error_description');
        if (error === 'access_denied' && errorDescription?.includes('expired')) {
          setMessage('Link has expired. Please request a new invitation or use "Forgot Password".');
        } else {
          setMessage('Authentication error. Please try again.');
        }
        return;
      }
    }

    // Redirect if already logged in and not setting up password
    if (user && !isPasswordSetup) {
      router.push('/');
    }
  }, [user, router, searchParams, isPasswordSetup]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setMessage('Please enter both email and password');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
      // Success - AuthContext will handle redirect
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.message?.includes('Invalid login credentials')) {
        setMessage('Invalid email or password.');
      } else {
        setMessage(`Error: ${error.message || 'Login failed'}`);
      }
    } finally {
      setLoading(false);
    }
  };


  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMessage('Please enter your email address first');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await resetPassword(email);
      if (error) throw error;

      setMessage('Password reset email sent! Check your inbox for the reset link.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      setMessage(`Error: ${error.message || 'Reset failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      setMessage('Please enter and confirm your new password');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Password updated successfully - user will be automatically signed in
      setMessage('Password updated successfully! Redirecting...');

      // Update invitation status to accepted
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          await supabase
            .from('invited_users')
            .update({
              status: 'accepted'
            })
            .eq('email', user.email);
        }
      } catch (err) {
        console.error('Error updating invitation status:', err);
      }

      // Small delay then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      console.error('Password update error:', error);
      setMessage(`Error: ${error.message || 'Password update failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim() || !confirmPassword.trim()) {
      setMessage('Please enter and confirm your password');
      return;
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // Password set successfully - user will be automatically signed in
      setMessage('Account setup complete! Redirecting...');

      // Update invitation status to accepted
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          await supabase
            .from('invited_users')
            .update({
              status: 'accepted'
            })
            .eq('email', user.email);
        }
      } catch (err) {
        console.error('Error updating invitation status:', err);
      }

      // Small delay then redirect to dashboard
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      console.error('Password setup error:', error);
      setMessage(`Error: ${error.message || 'Account setup failed'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {isPasswordSetup ? 'Set Your Password' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-blue-200">
            {isPasswordSetup ? 'Create your password to continue' : 'Sign in to your CRM dashboard'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl space-y-6">
          <form onSubmit={isPasswordSetup ? handlePasswordSetup : handleLogin} className="space-y-6">
            {!isPasswordSetup && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="your@email.com"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500 pr-12"
                  placeholder={isPasswordSetup ? "Create a secure password" : "Enter your password"}
                  minLength={isPasswordSetup ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {isPasswordSetup && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                  placeholder="Confirm your password"
                  minLength={6}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-all duration-200 hover:scale-105"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isPasswordSetup ? 'Setting Password...' : 'Signing In...'}
                </div>
              ) : (
                isPasswordSetup ? 'Set Password' : 'Sign In'
              )}
            </button>
          </form>

          {!isPasswordSetup && (
            <div className="flex items-center justify-between text-sm">
              <div className="text-blue-300/70 text-xs">
                Invitation-only access
              </div>
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="text-blue-300 hover:text-blue-200 transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          {message && (
            <div className={`p-4 rounded-xl ${message.includes('Error') || message.includes('Invalid') ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-green-500/20 text-green-200 border border-green-500/30'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-blue-300">
            Secure login powered by Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}
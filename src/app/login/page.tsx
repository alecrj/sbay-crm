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
  const [isSignUp, setIsSignUp] = useState(false);
  const [isPasswordReset, setIsPasswordReset] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [invitationToken, setInvitationToken] = useState('');
  const [isPasswordSetup, setIsPasswordSetup] = useState(false);
  const { user, signIn, signUp, resetPassword } = useAuth();
  const router = useRouter();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/');
    }

    // Check if this is a password reset
    if (searchParams) {
      const action = searchParams.get('action');
      const error = searchParams.get('error');

      if (action === 'reset_password') {
        setIsPasswordReset(true);
        setMessage('You can now set a new password for your account.');
      }

      if (action === 'set_password') {
        const token = searchParams.get('token');
        const emailParam = searchParams.get('email');
        if (token) {
          setInvitationToken(token);
          if (emailParam) {
            setEmail(decodeURIComponent(emailParam));
          }
          setIsPasswordSetup(true);
          setMessage('Welcome! Please set up your password to complete account creation.');
        }
      }

      if (error) {
        setMessage('There was an issue with authentication. Please try again.');
      }
    }
  }, [user, router, searchParams]);

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

      // Check if user needs to set up password
      if (error.message?.includes('Invalid login credentials')) {
        setMessage('Invalid email or password. Need to set up your account? Contact admin or use "Forgot Password".');
      } else {
        setMessage(`Error: ${error.message || 'Login failed'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setMessage('Please fill in all fields');
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
      // Check if email is invited
      const { data: invitation, error: invitationError } = await supabase
        .from('invited_users')
        .select('*')
        .eq('email', email)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        throw new Error('No invitation found. Please contact an administrator for access.');
      }

      const { error } = await signUp(email, password, {
        role: invitation.role,
        invited_by: invitation.invited_by
      });

      if (error) throw error;

      // Update invitation status
      await supabase
        .from('invited_users')
        .update({ status: 'accepted' })
        .eq('email', email);

      setMessage('Account created successfully! You can now sign in.');
      setIsSignUp(false);
      setPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Sign up error:', error);
      setMessage(`Error: ${error.message || 'Sign up failed'}`);
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

      setMessage('Password updated successfully! You can now sign in.');
      setIsPasswordReset(false);
      setPassword('');
      setConfirmPassword('');

      // Clear URL parameters
      window.history.replaceState({}, document.title, '/login');
    } catch (error: any) {
      console.error('Password update error:', error);
      setMessage(`Error: ${error.message || 'Password update failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setMessage('Email is required');
      return;
    }

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
      // Get invitation details
      const { data: invitation, error: invitationError } = await supabase
        .from('invited_users')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (invitationError || !invitation) {
        throw new Error('Invalid invitation token');
      }

      // Create user account with email and password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            role: invitation.role,
            invited_by: invitation.invited_by
          }
        }
      });

      if (signUpError) throw signUpError;

      // Update invitation status to accepted
      await supabase
        .from('invited_users')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('invitation_token', invitationToken);

      setMessage('Account created successfully! You can now sign in with your email and password.');
      setIsPasswordSetup(false);
      setPassword('');
      setConfirmPassword('');
      setInvitationToken('');

      // Clear URL parameters
      window.history.replaceState({}, document.title, '/login');
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-white">
            {isPasswordSetup ? 'Set Up Your Password' : isPasswordReset ? 'Set New Password' : isSignUp ? 'Complete Setup' : 'Welcome Back'}
          </h2>
          <p className="mt-2 text-blue-200">
            {isPasswordSetup
              ? 'Create your password to complete account setup'
              : isPasswordReset
                ? 'Enter your new password below'
                : isSignUp
                  ? 'Create your password to access your account'
                  : 'Sign in to your CRM dashboard'
            }
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl space-y-6">
          <form onSubmit={isPasswordSetup ? handlePasswordSetup : isPasswordReset ? handlePasswordReset : isSignUp ? handleSignUp : handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                required={!isPasswordSetup}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/90 backdrop-blur-sm border border-white/30 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-500"
                placeholder="your@email.com"
                disabled={isPasswordSetup}
                style={isPasswordSetup ? { opacity: 0.6 } : {}}
              />
            </div>

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
                  placeholder={isSignUp ? "Create a secure password" : "Enter your password"}
                  minLength={isSignUp ? 6 : undefined}
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

            {(isSignUp || isPasswordSetup || isPasswordReset) && (
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
                  {isPasswordSetup ? 'Setting Up Account...' : isSignUp ? 'Creating Account...' : 'Signing In...'}
                </div>
              ) : (
                isPasswordSetup ? 'Complete Setup' : isSignUp ? 'Create Account' : 'Sign In'
              )}
            </button>
          </form>

          {!isSignUp && !isPasswordSetup && !isPasswordReset && (
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

          {isSignUp && (
            <div className="text-center">
              <button
                onClick={() => setIsSignUp(false)}
                className="text-blue-300 hover:text-blue-200 text-sm transition-colors"
              >
                Already have a password? Sign in instead
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
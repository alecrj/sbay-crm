'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function MagicLoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const sendMagicLink = async () => {
    setLoading(true);
    setMessage('');

    try {
      // First check if email is invited
      const { data: invitation, error: invitationError } = await supabase
        .from('invited_users')
        .select('*')
        .eq('email', email)
        .eq('status', 'accepted')
        .single();

      if (invitationError || !invitation) {
        throw new Error('Access denied. You need an invitation to access this system.');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Your invitation has expired. Please contact the administrator for a new invitation.');
      }

      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: 'https://sbaycrm.netlify.app/auth/callback'
        }
      });

      if (error) throw error;

      setSent(true);
      setMessage(`Magic link sent to ${email}! Check your inbox and click the link to sign in.`);
    } catch (error) {
      console.error('Error:', error);
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Magic Link Login
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No password needed - we'll email you a secure login link
          </p>
        </div>

        <div className="bg-white p-8 rounded-lg shadow border space-y-6">
          {!sent ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your@email.com"
                />
              </div>

              <button
                onClick={sendMagicLink}
                disabled={loading || !email}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900">Check Your Email!</h3>
              <p className="text-sm text-gray-600">
                We sent a magic link to <strong>{email}</strong>
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-sm text-blue-800 space-y-2">
                  <p><strong>Check your inbox</strong> (including spam folder)</p>
                  <p><strong>Click the magic link</strong> in the email</p>
                  <p><strong>You'll be automatically logged in</strong></p>
                </div>
              </div>
              <button
                onClick={() => {setSent(false); setMessage('');}}
                className="text-blue-600 hover:text-blue-500 text-sm"
              >
                Send to different email
              </button>
            </div>
          )}

          {message && !sent && (
            <div className={`p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
              <p className="text-sm">{message}</p>
            </div>
          )}

          <div className="text-center space-y-2">
            <a
              href="/login"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to regular login
            </a>
            <p className="text-xs text-gray-500">
              Magic links are secure and expire after 1 hour
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-800 mb-2">Secure Access</h3>
          <div className="text-sm text-yellow-700 space-y-1">
            <p>• Only invited users can access the system</p>
            <p>• Email must be pre-approved by admin</p>
            <p>• Invitations expire for security</p>
            <p>• No passwords needed - just email verification</p>
          </div>
        </div>
      </div>
    </div>
  );
}
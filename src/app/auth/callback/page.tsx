'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setIsLoading(true);

        // Check if this is an invitation callback first
        const type = searchParams.get('type');
        const token = searchParams.get('token');

        if (type === 'invite' && token) {
          // For invitations, we don't need a session yet
          // Validate the invitation token and redirect to password setup
          try {
            const { data: invitation, error: invitationError } = await supabase
              .from('invited_users')
              .select('*')
              .eq('invitation_token', token)
              .eq('status', 'pending')
              .single();

            if (invitationError || !invitation) {
              console.error('Invalid invitation token:', invitationError);
              setError('Invalid or expired invitation link.');
              setTimeout(() => router.push('/login?error=invalid_invitation'), 2000);
              return;
            }

            // Check if invitation is expired
            if (new Date() > new Date(invitation.expires_at)) {
              console.error('Invitation expired');
              setError('This invitation has expired.');
              setTimeout(() => router.push('/login?error=expired_invitation'), 2000);
              return;
            }

            // Redirect to password setup with the user's email pre-filled
            router.replace(`/login?action=set_password&token=${token}&email=${encodeURIComponent(invitation.email)}`);
            return;
          } catch (error) {
            console.error('Error processing invitation:', error);
            setError('Error processing invitation.');
            setTimeout(() => router.push('/login?error=invitation_failed'), 2000);
            return;
          }
        }

        // For non-invitation callbacks, check session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setError('Authentication failed. Please try again.');
          setTimeout(() => router.push('/login?error=auth_failed'), 2000);
          return;
        }

        if (data.session) {
          if (type === 'recovery') {
            // Redirect to password reset form
            router.push('/login?action=reset_password');
          } else {
            // Regular login, redirect to dashboard
            router.replace('/');
          }
        } else {
          // No session, redirect back to login
          setTimeout(() => router.push('/login?error=no_session'), 2000);
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        setError('An unexpected error occurred.');
        setTimeout(() => router.push('/login?error=unexpected'), 2000);
      } finally {
        setIsLoading(false);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="text-center bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl">
        {error ? (
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-200">{error}</p>
            <p className="text-blue-300 text-sm">Redirecting to login...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
            <p className="text-white">
              {isLoading ? 'Completing authentication...' : 'Redirecting...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
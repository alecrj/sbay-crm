'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useUserRole } from '../../../contexts/UserRoleContext';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

interface Invitation {
  id: string;
  email: string;
  role: string;
  invitation_token: string;
  invited_at: string;
  accepted_at?: string;
  expires_at: string;
  status: string;
}

export default function InvitationsPage() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    role: 'user'
  });
  const [message, setMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastInvitedEmail, setLastInvitedEmail] = useState('');

  // Temporarily disable admin check to debug
  // useEffect(() => {
  //   if (!roleLoading && !isAdmin) {
  //     router.push('/');
  //   }
  // }, [isAdmin, roleLoading, router]);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('invited_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch('/api/admin/send-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          role: formData.role,
          invitedBy: user?.id
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Invitation API Error:', {
          status: response.status,
          statusText: response.statusText,
          data
        });
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      setLastInvitedEmail(formData.email);
      setFormData({ email: '', role: 'user' });
      setShowForm(false);
      setShowSuccessModal(true);
      await loadInvitations();
    } catch (error) {
      console.error('Error sending invitation:', error);
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const revokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      const { error } = await supabase
        .from('invited_users')
        .update({ status: 'expired' })
        .eq('id', id);

      if (error) throw error;
      await loadInvitations();
    } catch (error) {
      console.error('Error revoking invitation:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Temporarily disable admin check to debug
  // if (!isAdmin) {
  //   return null; // Will redirect in useEffect
  // }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                User Invitations
              </h1>
              <p className="text-gray-600">
                Manage who can access your CRM system with email/password authentication
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Invite User
            </button>
          </div>
        </div>

        {/* Invitation Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Invite New User</h2>
                <button
                  onClick={() => {setShowForm(false); setMessage('');}}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={sendInvitation} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="user@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role *
                  </label>
                  <select
                    required
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User (Basic Access)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Send Invitation
                  </button>
                  <button
                    type="button"
                    onClick={() => {setShowForm(false); setMessage('');}}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>

              {message && (
                <div className={`mt-4 p-3 rounded-lg text-sm ${
                  message.includes('invited') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {message}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Invitation Sent!</h2>
                <p className="text-gray-600">
                  <strong>{lastInvitedEmail}</strong> has been invited to join your CRM.
                </p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-green-900 mb-2">✅ Invitation Email Sent!</h3>
                <div className="text-sm text-green-800 space-y-2">
                  <p><strong>What happens next:</strong></p>
                  <p>• {lastInvitedEmail} will receive a secure invitation email</p>
                  <p>• They click the magic link to automatically create their account</p>
                  <p>• Their account is created and they're immediately logged in</p>
                  <p>• No passwords needed - completely secure and automatic</p>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900 mb-2">Security Features:</h4>
                <div className="text-sm text-gray-700 space-y-1">
                  <p>• Invitation expires in 7 days</p>
                  <p>• One-time use secure token</p>
                  <p>• Only invited emails can create accounts</p>
                  <p>• Role automatically assigned ({lastInvitedEmail ? 'Admin' : 'User'})</p>
                </div>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="font-medium text-green-900 mb-2">✅ Secure Email Invitation System</h3>
          <div className="text-sm text-green-800 space-y-2">
            <p><strong>1. Send invitations</strong> - Enter email and select role, system automatically sends invitation email</p>
            <p><strong>2. Secure magic link</strong> - Invited user receives email with secure invitation link</p>
            <p><strong>3. One-click setup</strong> - They click the link to automatically create their account</p>
            <p><strong>4. Immediate access</strong> - Account is created and they're logged in to the CRM</p>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Current Invitations</h3>
          </div>

          {invitations.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations yet</h3>
              <p className="text-gray-600 mb-6">
                Invite your team and clients to create accounts and access the CRM system.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Send First Invitation
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invited
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <tr key={invitation.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {invitation.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className="capitalize">{invitation.role}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(invitation.status)}`}>
                          {invitation.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(invitation.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(invitation.expires_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {invitation.status === 'accepted' && (
                          <button
                            onClick={() => revokeInvitation(invitation.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useState } from 'react';

interface UserInvitationProps {
  onUserInvited?: () => void;
}

const UserInvitation: React.FC<UserInvitationProps> = ({ onUserInvited }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'agent',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [invitedUser, setInvitedUser] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setInvitedUser(null);

    try {
      const response = await fetch('/api/admin/invite-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite user');
      }

      setMessage('User invited successfully!');
      setInvitedUser(data);
      setFormData({ email: '', name: '', role: 'agent' });
      onUserInvited?.();

    } catch (error) {
      console.error('Error inviting user:', error);
      setMessage(error instanceof Error ? error.message : 'Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const copyCredentials = () => {
    if (invitedUser) {
      const credentials = `Email: ${invitedUser.user.email}\nTemporary Password: ${invitedUser.tempPassword}`;
      navigator.clipboard.writeText(credentials);
      alert('Credentials copied to clipboard!');
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email Address
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Full Name
          </label>
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="John Smith"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="agent">Agent - Full CRM access</option>
            <option value="assistant">Assistant - Limited access</option>
            <option value="admin">Admin - Full system access</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {loading ? 'Inviting...' : 'Invite User'}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-4 rounded-md ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      {invitedUser && (
        <div className="mt-4 p-4 bg-blue-50 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">User Created Successfully!</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p><strong>Email:</strong> {invitedUser.user.email}</p>
            <p><strong>Name:</strong> {invitedUser.user.name}</p>
            <p><strong>Role:</strong> {invitedUser.user.role}</p>
            <p><strong>Temporary Password:</strong> <code className="bg-white px-2 py-1 rounded">{invitedUser.tempPassword}</code></p>
          </div>
          <button
            onClick={copyCredentials}
            className="mt-2 text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
          >
            Copy Credentials
          </button>
          <p className="text-xs text-blue-600 mt-2">
            Share these credentials with the user. They can change their password after first login.
          </p>
        </div>
      )}
    </div>
  );
};

export default UserInvitation;
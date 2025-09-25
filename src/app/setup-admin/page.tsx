'use client';

import React, { useState } from 'react';

export default function SetupAdminPage() {
  const [email, setEmail] = useState('admin@shallowbayadvisors.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const createAdminUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('/api/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ SUCCESS! You can now log in with:\nEmail: ${email}\nPassword: ${password}`);
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Setup Admin User</h2>
          <p className="mt-2 text-blue-200">Create an admin user with password</p>
        </div>

        <div className="bg-white/10 backdrop-blur-sm p-8 rounded-2xl border border-white/20 shadow-xl">
          <form onSubmit={createAdminUser} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white/90 border border-white/30 rounded-xl text-gray-900"
                placeholder="admin@yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/90 border border-white/30 rounded-xl text-gray-900"
                placeholder="admin123"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? 'Creating Admin User...' : 'Create Admin User'}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-xl ${
              message.includes('SUCCESS') ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'
            }`}>
              <pre className="text-sm whitespace-pre-wrap">{message}</pre>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-blue-300">
            One-time setup page
          </p>
        </div>
      </div>
    </div>
  );
}
'use client';

import React, { useEffect, useState } from 'react';

interface EnvStatus {
  supabaseUrl: boolean;
  supabaseAnonKey: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export default function EnvironmentCheck() {
  const [envStatus, setEnvStatus] = useState<EnvStatus>({
    supabaseUrl: false,
    supabaseAnonKey: false,
    hasError: false,
  });

  useEffect(() => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      setEnvStatus({
        supabaseUrl: !!supabaseUrl && supabaseUrl.length > 0,
        supabaseAnonKey: !!supabaseAnonKey && supabaseAnonKey.length > 0,
        hasError: false,
      });
    } catch (error) {
      setEnvStatus({
        supabaseUrl: false,
        supabaseAnonKey: false,
        hasError: true,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, []);

  const allGood = envStatus.supabaseUrl && envStatus.supabaseAnonKey && !envStatus.hasError;

  if (allGood) {
    return null; // Don't show anything if everything is working
  }

  return (
    <div className="fixed inset-0 bg-red-500 text-white p-4 z-50 flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold mb-4">Environment Configuration Error</h1>
        <div className="text-sm space-y-2">
          <div>
            Supabase URL: {envStatus.supabaseUrl ? '✅' : '❌'}
          </div>
          <div>
            Supabase Anon Key: {envStatus.supabaseAnonKey ? '✅' : '❌'}
          </div>
          {envStatus.hasError && (
            <div className="mt-4 p-3 bg-red-700 rounded">
              Error: {envStatus.errorMessage}
            </div>
          )}
          <div className="mt-4 text-xs">
            Please check your environment variables in Netlify
          </div>
        </div>
      </div>
    </div>
  );
}
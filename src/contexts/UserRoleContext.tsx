'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface UserRoleContextType {
  userRole: 'admin' | 'user' | null;
  loading: boolean;
  isAdmin: boolean;
  isUser: boolean;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export function UserRoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.email) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data: invitation, error } = await supabase
          .from('invited_users')
          .select('role')
          .eq('email', user.email)
          .eq('status', 'accepted')
          .single();

        if (error || !invitation) {
          // If no invitation found or table doesn't exist, default to admin
          // This ensures the system works even if invited_users table isn't set up yet
          console.log('No user role found in invited_users table, defaulting to admin');
          setUserRole('admin');
        } else {
          setUserRole(invitation.role as 'admin' | 'user');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        // Default to admin if there's any database error
        setUserRole('admin');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const value = {
    userRole,
    loading,
    isAdmin: userRole === 'admin',
    isUser: userRole === 'user',
  };

  return (
    <UserRoleContext.Provider value={value}>
      {children}
    </UserRoleContext.Provider>
  );
}

export function useUserRole() {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
}
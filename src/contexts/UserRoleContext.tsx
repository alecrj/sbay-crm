'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

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
    const fetchUserRole = () => {
      if (!user) {
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Get role from user metadata (set when creating user)
      const role = user.user_metadata?.role;

      if (role === 'admin' || role === 'user') {
        setUserRole(role);
      } else {
        // Default to user role if no role specified
        setUserRole('user');
      }

      setLoading(false);
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
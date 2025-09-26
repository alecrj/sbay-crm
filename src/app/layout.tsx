import { Outfit } from 'next/font/google';
import './globals.css';
import type { Metadata } from 'next';

import { SidebarProvider } from '@/context/SidebarContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { UserRoleProvider } from '@/contexts/UserRoleContext';

export const metadata: Metadata = {
  title: 'alecrj software | Professional CRM',
  description: 'Professional CRM System by alecrj software - Custom-built for Commercial Real Estate Management',
};

const outfit = Outfit({
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <AuthProvider>
            <UserRoleProvider>
              <SidebarProvider>{children}</SidebarProvider>
            </UserRoleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

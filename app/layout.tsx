import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SQL Chat',
  description: 'Chat application with n8n webhook integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
} 
import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Panel Super Admin - TopEstrellas',
  description: 'Panel de administración para super administradores de TopEstrellas',
};

export default function SuperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

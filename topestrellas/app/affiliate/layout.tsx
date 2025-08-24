import { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Panel de Afiliado - TopEstrellas',
  description: 'Panel de gestión para afiliados de TopEstrellas',
};

export default function AffiliateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

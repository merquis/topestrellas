import { NextResponse } from 'next/server';

/**
 * Endpoint público para obtener la clave pública de Stripe en runtime.
 * Útil cuando NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY no quedó embebida en el build.
 */
export async function GET() {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
    process.env.STRIPE_PUBLISHABLE_KEY ||
    '';

  if (!publishableKey || !publishableKey.startsWith('pk_')) {
    return NextResponse.json(
      { error: 'Stripe publishable key no configurada' },
      { status: 500 }
    );
  }

  return NextResponse.json({ publishableKey });
}

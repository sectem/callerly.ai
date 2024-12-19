import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

export async function middleware(req) {
  // Create a Supabase client configured to use cookies
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Check auth session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If accessing Twilio API routes, verify authentication
  if (req.nextUrl.pathname.startsWith('/api/twilio')) {
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return res;
}

// Specify which routes this middleware should run for
export const config = {
  matcher: [
    '/api/twilio/:path*',
    '/dashboard/:path*'
  ],
}; 
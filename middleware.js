import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';

// List of paths that require authentication
const protectedPaths = ['/dashboard', '/settings', '/billing', '/agents'];

export async function middleware(req) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  try {
    // Try to get the session
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    // Debug logging
    console.log('Middleware Check:', {
      path: req.nextUrl.pathname,
      hasSession: !!session,
      error: error?.message
    });

    // For API routes, attach the session and return early
    if (req.nextUrl.pathname.startsWith('/api')) {
      return res;
    }

    // Check if the path requires authentication
    const isProtectedPath = protectedPaths.some(path => 
      req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`)
    );

    // Debug logging for protected paths
    if (isProtectedPath) {
      console.log('Protected Path Check:', {
        path: req.nextUrl.pathname,
        hasSession: !!session,
        isProtectedPath
      });
    }

    // Handle auth callback
    if (req.nextUrl.pathname === '/auth/callback') {
      if (session) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/signin?error=auth_failed', req.url));
    }

    // If there was an error checking the session, let the request continue
    // This prevents redirect loops when the session check fails
    if (error) {
      console.error('Session check error:', error);
      return res;
    }

    // Only redirect to signin if:
    // 1. The path requires authentication
    // 2. There is no session
    // 3. There was no error checking the session
    if (isProtectedPath && !session) {
      console.log('Redirecting to signin:', {
        from: req.nextUrl.pathname,
        hasSession: !!session
      });
      const redirectUrl = new URL('/signin', req.url);
      redirectUrl.searchParams.set('redirect', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect to dashboard if accessing auth pages while logged in
    if (session && (req.nextUrl.pathname === '/signin' || req.nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // For all other cases, return the response with the session cookie
    return res;

  } catch (error) {
    // If there's an error checking the session, allow the request to continue
    // This prevents redirect loops on session check failures
    console.error('Middleware session check error:', error);
    return res;
  }
}

// Specify which routes to run the middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    const response = NextResponse.next()

    // Check for custom auth cookie
    const hasSession = request.cookies.has('auth_session');

    const isAuthPage = request.nextUrl.pathname.startsWith('/auth')
    const isApiPage = request.nextUrl.pathname.startsWith('/api')
    const isStatic = request.nextUrl.pathname.match(/\.(.*)$/)

    if (isApiPage || isStatic) {
        return response
    }

    if (!hasSession && !isAuthPage) {
        return NextResponse.redirect(new URL('/auth', request.url))
    }

    if (hasSession && isAuthPage) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // SLIDING EXPIRATION: Refresh the session cookie to extend duration
    if (hasSession) {
        const sessionCookie = request.cookies.get('auth_session');
        if (sessionCookie) {
            response.cookies.set('auth_session', sessionCookie.value, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24, // Reset to 1 day
                path: '/',
            });
        }
    }

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

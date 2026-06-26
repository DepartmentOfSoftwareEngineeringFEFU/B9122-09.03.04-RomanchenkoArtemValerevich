import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ["/", "/about", "/login", "/register"]

// Define API routes (handled separately)
const API_ROUTES_PREFIX = "/api"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes - they handle their own auth
  if (pathname.startsWith(API_ROUTES_PREFIX)) {
    return NextResponse.next()
  }

  // Skip public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.next()
  }

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Check for auth session (cookie-based)
  // In demo mode, we use a simple cookie. In production, this would be a JWT or session token.
  const authSession = request.cookies.get("auth-session")

  // If accessing dashboard without auth, redirect to login
  if (pathname.startsWith("/dashboard") && !authSession) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated user tries to access login/register, redirect to dashboard
  if (authSession && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|_next).*)",
  ],
}

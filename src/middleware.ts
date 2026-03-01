import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// On Vercel: set NEXTAUTH_URL=https://your-app.vercel.app and NEXTAUTH_SECRET so the JWT cookie is valid and middleware can recognize logged-in users.

/** Debug header so you can see middleware result in browser Network tab (Response Headers). Remove when done. */
function debugHeader(
  pathname: string,
  hasToken: boolean,
  hasSecret: boolean,
  authCookiePresent: boolean,
  action: string,
): string {
  return [
    `path=${pathname}`,
    `token=${hasToken ? "yes" : "no"}`,
    `secret=${hasSecret ? "yes" : "no"}`,
    `cookie=${authCookiePresent ? "yes" : "no"}`,
    `action=${action}`,
  ].join(" ");
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const publicRoutes = [ "/login"];
  const isPublicRoute = publicRoutes.includes(pathname);

  const secret = process.env.NEXTAUTH_SECRET;
  const hasSecret = !!secret;
  if (!secret && process.env.NODE_ENV === "development") {
    console.warn(
      "[middleware] NEXTAUTH_SECRET is not set. Add it to .env for auth to work.",
    );
  }
  // Auth.js v5 uses __Secure-authjs.session-token on HTTPS; getToken needs the same name
  const isSecure = request.nextUrl.protocol === "https:";
  const cookieName = isSecure ? "__Secure-authjs.session-token" : "authjs.session-token";
  const token = secret ? await getToken({ req: request, secret, cookieName }) : null;

  const cookieNames = ["authjs.session-token", "next-auth.session-token", "__Secure-authjs.session-token", "__Secure-next-auth.session-token"];
  const authCookiePresent = cookieNames.some((name) => request.cookies.get(name)?.value);

  // Redirect to login if not authenticated (except for public routes)
  if (!isPublicRoute && !token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    const res = NextResponse.redirect(loginUrl);
    res.headers.set("X-Middleware-Debug", debugHeader(pathname, !!token, hasSecret, authCookiePresent, "redirect-to-login"));
    return res;
  }

  // Redirect to callbackUrl (or home) if logged-in user visits /login
  if (pathname === "/login" && token) {
    const callbackUrl = request.nextUrl.searchParams.get("callbackUrl") || "/";
    const target = callbackUrl.startsWith("/") ? new URL(callbackUrl, request.url) : new URL("/", request.url);
    const res = NextResponse.redirect(target);
    res.headers.set("X-Middleware-Debug", debugHeader(pathname, !!token, hasSecret, authCookiePresent, "redirect-after-login"));
    return res;
  }

  const res = NextResponse.next();
  res.headers.set("X-Middleware-Debug", debugHeader(pathname, !!token, hasSecret, authCookiePresent, "allow"));
  return res;
}

export const config = {
  matcher: [
    // Match all routes except static files, api, and _next
    "/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)",
  ],
};

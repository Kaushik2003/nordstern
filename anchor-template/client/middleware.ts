import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { nextUrl } = req;

  const isApiRoute = nextUrl.pathname.startsWith("/api");
  const isBizRoute = nextUrl.pathname.startsWith("/biz");
  const isCpRoute = nextUrl.pathname.startsWith("/cp");
  const isLoginRoute = nextUrl.pathname === "/login";

  if (isApiRoute || isBizRoute || isCpRoute) {
    return;
  }

  if (isLoginRoute) {
    if (isLoggedIn) {
      return Response.redirect(new URL("/", nextUrl));
    }
    return;
  }

  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

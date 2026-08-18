export function csrfProtection(req, res, next) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];

  if (safeMethods.includes(req.method)) {
    return next();
  }

  const csrfCookie = req.cookies.csrfToken;
  const csrfHeader = req.headers["x-csrf-token"];

  // 1. If both are present, verify match
  if (csrfCookie && csrfHeader) {
    if (csrfCookie !== csrfHeader) {
      return res.status(403).json({
        success: false,
        message: "Invalid CSRF token",
      });
    }
    return next();
  }

  // 2. If csrfHeader is present (from API response storage) and matches or is non-empty
  if (csrfHeader && csrfHeader.length >= 16) {
    return next();
  }

  // 3. For cross-origin SPAs (Vercel -> Render) where document.cookie cannot read cross-site cookies,
  // verify request Origin/Referer against allowed origins
  const origin = req.headers.origin || req.headers.referer || "";
  const clientUrl = process.env.CLIENT_URL || "";

  if (
    (clientUrl && origin.startsWith(clientUrl)) ||
    origin.includes("vercel.app") ||
    origin.includes("localhost") ||
    origin.includes("127.0.0.1")
  ) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: "CSRF token missing",
  });
}
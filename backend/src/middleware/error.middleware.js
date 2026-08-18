export function errorHandler(err, req, res, next) {
  console.error("Unhandled Error:", err);

  const statusCode = err.statusCode || err.status || 500;
  
  const response = {
    success: false,
    message: statusCode === 500 ? "Internal server error" : err.message,
  };

  // Attach stack trace only in development
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}

import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: string | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (typeof err === "string") {
    // Custom application error
    const is404 = err.toLowerCase().endsWith("not found");
    const statusCode = is404 ? 404 : 400;
    res.status(statusCode).json({ message: err });
    return;
  }

  if (err instanceof Error && err.name === "UnauthorizedError") {
    // JWT authentication error
    res.status(401).json({ message: "Invalid Token" });
    return;
  }

  if (err instanceof Error && err.name === "ValidationError") {
    // Joi validation error
    res.status(400).json({ message: err.message });
    return;
  }

  if (err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
    // Body parser syntax error
    res.status(400).json({ message: "Malformed JSON in request body" });
    return;
  }

  // Default to 500 server error
  console.error(err);
  res.status(500).json({ message: err instanceof Error ? err.message : "Internal Server Error" });
}

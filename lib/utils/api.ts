/**
 * API utility functions for request handling and validation
 */

/**
 * Pick only allowed fields from an object (whitelist pattern)
 * Prevents mass assignment vulnerabilities
 */
export function pickAllowedFields<T extends Record<string, unknown>>(
  body: T,
  allowedFields: readonly string[]
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of allowedFields) {
    if (field in body) {
      result[field as keyof T] = body[field as keyof T];
    }
  }
  return result;
}

/**
 * Safely parse JSON from a request
 * Returns null if parsing fails instead of throwing
 */
export async function safeParseJson<T = unknown>(
  request: Request
): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

/**
 * Create a standardized JSON error response
 */
export function jsonError(
  message: string,
  status: number = 400
): Response {
  return Response.json({ error: message }, { status });
}

/**
 * Create a standardized JSON success response
 */
export function jsonSuccess<T>(
  data: T,
  status: number = 200
): Response {
  return Response.json(data, { status });
}

/**
 * Validate request body exists and is valid JSON
 * Returns parsed body or error response
 */
export async function parseRequestBody<T = unknown>(
  request: Request
): Promise<{ data: T } | { error: Response }> {
  const body = await safeParseJson<T>(request);
  if (body === null) {
    return { error: jsonError("Invalid JSON") };
  }
  return { data: body };
}

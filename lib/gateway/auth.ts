export function extractBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  const token = match[1].trim();
  return token ? token : null;
}


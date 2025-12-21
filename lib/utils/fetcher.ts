// Usage: useSWR("/api/...", jsonFetcher)

async function jsonRequest(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`.trim();
    if (isJson) {
      const body = (await res.json().catch(() => null)) as null | { error?: unknown; message?: unknown };
      const bodyMessage =
        (typeof body?.error === "string" && body.error) ||
        (typeof body?.message === "string" && body.message) ||
        "";
      if (bodyMessage) message = bodyMessage;
    }
    throw new Error(message);
  }

  if (isJson) return await res.json();
  return await res.text();
}

async function jsonFetcher(url: string): Promise<unknown> {
  return jsonRequest(url);
}

export { jsonFetcher, jsonRequest };

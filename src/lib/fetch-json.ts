/**
 * Reads an API response that should be JSON. Error pages from a proxy or a timeout are
 * HTML, and showing "Unexpected token <" to people is worse than a plain sentence.
 */
export async function readJson<T extends object>(res: Response): Promise<Partial<T> & { error?: string }> {
  try {
    const data: unknown = await res.json();
    return data && typeof data === "object" ? (data as Partial<T> & { error?: string }) : {};
  } catch {
    return {};
  }
}

/** The message to show for a failed response: the server's own words, or one that fits the status. */
export function failure(res: Response, data: { error?: string }, fallback: string): string {
  if (typeof data.error === "string" && data.error) return data.error;
  if (res.status === 429) return "Too many tries in a short time. Wait a minute and try again.";
  if (res.status >= 500) return "Zaproom's server is having trouble right now. Try again in a moment.";
  return fallback;
}

export const OFFLINE = "Couldn't reach Zaproom. Check your connection and try again.";

/** POST a JSON body and read a JSON answer. Network errors become a friendly message. */
export async function postJson<T extends object>(
  url: string,
  body: unknown,
  fallback: string,
): Promise<{ ok: true; data: Partial<T> } | { ok: false; status: number; error: string }> {
  let res: Response;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    return { ok: false, status: 0, error: OFFLINE };
  }
  const data = await readJson<T>(res);
  return res.ok ? { ok: true, data } : { ok: false, status: res.status, error: failure(res, data, fallback) };
}

/** When the browser can't open the live connection to LiveKit at all. */
export const CALL_CONNECT_FAILED =
  "Couldn't connect to the call. Your network may be blocking it (some office and school networks do). Try another network, or rejoin in a moment.";

export const CONNECT_FAILED =
  "Couldn't connect to the chat server. Your network may be blocking it (some office and school networks do). Try another network, or try again in a moment.";

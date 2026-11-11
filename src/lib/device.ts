import { createHmac } from "node:crypto";

/**
 * The global chat needs an identity that survives a page reload, so direct-message
 * history still lines up. Each browser keeps a random device key; the server turns it
 * into a public identity with an HMAC. Others only ever see the HMAC, so they can't
 * work back to the key and take over someone's identity.
 */
export const DEVICE_KEY = /^[A-Za-z0-9_-]{32,64}$/;

export function deviceIdentity(deviceKey: string, secret: string): string {
  return `u_${createHmac("sha256", secret).update(`zaproom-device:${deviceKey}`).digest("base64url").slice(0, 22)}`;
}

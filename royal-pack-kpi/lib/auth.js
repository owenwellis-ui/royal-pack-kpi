// Works in both the Edge middleware and Node route handlers — uses only
// Web Crypto (crypto.subtle), which both runtimes provide.
export async function makeAuthToken(password, salt) {
  const enc = new TextEncoder();
  const data = enc.encode(`${password}:${salt}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const AUTH_COOKIE_NAME = 'rp_auth';

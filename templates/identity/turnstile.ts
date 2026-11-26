export async function verifyTurnstileToken(token: string, secret = process.env.TURNSTILE_SECRET_KEY) {
  if (!secret || !token) return false;
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token }),
  });
  const data = (await response.json()) as { success?: boolean };
  return Boolean(data.success);
}

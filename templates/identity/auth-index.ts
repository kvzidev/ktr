import { betterAuth } from "better-auth";

export function createAuth(options: { secret?: string; baseURL?: string }) {
  return betterAuth({
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    baseURL: options.baseURL ?? process.env.BETTER_AUTH_URL,
  });
}

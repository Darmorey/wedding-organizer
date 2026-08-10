export const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

export const PASSWORD_RESET_REDIRECT = `${APP_URL}/auth/reset-password`

export function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name]
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return value
}

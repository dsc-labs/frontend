/**
 * Base chain JSON-RPC URL for **server** routes (waitlist snapshot/register, etc.).
 * Prefer `BASE_RPC_URL` so API config is not tied to the `VITE_` client prefix.
 * Falls back to `VITE_BASE_RPC_URL` when you keep a single URL in `.env` for both app + API.
 */
export function getServerBaseRpcUrl(): string | undefined {
  const explicit = process.env.BASE_RPC_URL?.trim()
  if (explicit) return explicit
  return process.env.VITE_BASE_RPC_URL?.trim() || undefined
}

/** Archive-capable Base RPC for historical `eth_call` / block lookups (falls back to {@link getServerBaseRpcUrl}). */
export function getServerArchiveRpcUrl(): string | undefined {
  const archive = process.env.BASE_ARCHIVE_RPC_URL?.trim()
  if (archive) return archive
  return getServerBaseRpcUrl()
}

export async function jsonRpc<T>(
  rpcUrl: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
  })
  const json = (await res.json()) as { result?: T; error?: { message?: string } }
  if (!res.ok || json.error) {
    throw new Error(json.error?.message || `RPC ${method} failed (${res.status})`)
  }
  if (json.result === undefined) throw new Error(`RPC ${method} returned no result`)
  return json.result
}

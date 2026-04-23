/**
 * X (Twitter) profile image via API v2 (server-side bearer token only).
 */

export function normalizeTwitterUsername(raw: string): string {
  return raw.trim().replace(/^@+/, '')
}

export function upsampleTwitterProfileImage(url: string): string {
  return url
    .replace(/_normal\.(jpg|jpeg|png|webp)$/i, '_400x400.$1')
    .replace(/_bigger\.(jpg|jpeg|png|webp)$/i, '_400x400.$1')
    .replace(/_mini\.(jpg|jpeg|png|webp)$/i, '_400x400.$1')
}

/** Returns a direct image URL, or null if no token / user not found / error. */
export async function tryTwitterProfileImageUrl(
  cleanUsername: string,
  bearerToken: string | undefined,
): Promise<string | null> {
  if (!bearerToken) {
    return null
  }

  try {
    const res = await fetch(
      `https://api.twitter.com/2/users/by/username/${encodeURIComponent(cleanUsername)}?user.fields=profile_image_url`,
      { headers: { Authorization: `Bearer ${bearerToken}` } },
    )
    if (!res.ok) {
      return null
    }
    const json = (await res.json()) as {
      data?: { profile_image_url?: string }
    }
    const rawUrl = json?.data?.profile_image_url
    if (!rawUrl) {
      return null
    }
    return upsampleTwitterProfileImage(rawUrl)
  } catch {
    return null
  }
}

/**
 * Server-only: exchange OAuth 2.0 authorization code (with PKCE) for an access token,
 * then fetch the authenticated user (users/me).
 *
 * Env: TWITTER_OAUTH2_CLIENT_ID, TWITTER_OAUTH2_CLIENT_SECRET
 * @see https://developer.twitter.com/en/docs/authentication/oauth-2-0/authorization-code
 */

import { Buffer } from 'node:buffer'

export type XOAuthPublicProfile = {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

export async function exchangeTwitterOAuth2Code(args: {
  clientId: string
  clientSecret: string
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<XOAuthPublicProfile> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: args.clientId,
    code: args.code,
    redirect_uri: args.redirectUri,
    code_verifier: args.codeVerifier,
  })

  const basic = Buffer.from(`${args.clientId}:${args.clientSecret}`).toString('base64')

  const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basic}`,
    },
    body: body.toString(),
  })

  const tokenText = await tokenRes.text()
  if (!tokenRes.ok) {
    throw new Error(`Twitter token error ${tokenRes.status}: ${tokenText}`)
  }

  const tokenJson = JSON.parse(tokenText) as { access_token?: string }
  if (!tokenJson.access_token) {
    throw new Error('Twitter token response missing access_token')
  }

  const meRes = await fetch(
    'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name',
    { headers: { Authorization: `Bearer ${tokenJson.access_token}` } },
  )
  const meText = await meRes.text()
  if (!meRes.ok) {
    throw new Error(`Twitter users/me error ${meRes.status}: ${meText}`)
  }

  const meJson = JSON.parse(meText) as {
    data?: { id: string; username: string; name: string; profile_image_url?: string }
  }
  const d = meJson.data
  if (!d?.id || !d.username) {
    throw new Error('Twitter users/me response missing user data')
  }

  return {
    id: d.id,
    username: d.username,
    name: d.name,
    profile_image_url: d.profile_image_url,
  }
}

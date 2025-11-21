'use strict'

import Cloudflare from 'cloudflare'

/**
 * Creates a Cloudflare API client with the appropriate authentication method.
 *
 * @param {string} token - API token (modern auth) or API key (legacy auth)
 * @param {string} accountEmail - Email address for legacy API key authentication (optional)
 * @returns {Cloudflare} Configured Cloudflare client
 *
 * Authentication modes:
 * - Modern: Pass only token (no accountEmail) - uses API token authentication
 * - Legacy: Pass both token and accountEmail - uses API key + email authentication
 */
export default function createCloudflareClient(token, accountEmail) {
  return new Cloudflare({
    apiToken: accountEmail ? undefined : token,
    apiKey: accountEmail ? token : undefined,
    apiEmail: accountEmail
  })
}

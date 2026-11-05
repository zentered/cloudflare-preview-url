'use strict'

import core from '@actions/core'
import { V4PagePaginationArray } from 'cloudflare/pagination'
import createCloudflareClient from './cloudflare-client.js'

/**
 * Finds the Worker Preview for a branch and its latest deployment.
 * https://developers.cloudflare.com/workers/previews/
 *
 * The SDK has no Previews resource yet, so this calls the endpoints through
 * the SDK's generic get and getAPIList.
 *
 * @returns {Promise<{id: string, url: string, branchUrl: string} | null>}
 * null when the Preview or a matching deployment does not exist yet.
 */
export default async function getWorkerPreviewUrl(
  token,
  accountId,
  accountEmail,
  workerName,
  branch,
  commitHash
) {
  const cf = createCloudflareClient(token, accountEmail)
  const base = `/accounts/${accountId}/workers/workers/${encodeURIComponent(workerName)}/previews`

  // The Preview name defaults to the branch name. The endpoint accepts the
  // URL-encoded name in place of the Preview id.
  let preview
  try {
    const response = await cf.get(`${base}/${encodeURIComponent(branch)}`)
    preview = response.result
  } catch (error) {
    if (error.status === 404) {
      core.info(`No Worker Preview named ${branch} on ${workerName} yet`)
      return null
    }
    throw new Error(`Error fetching Worker Preview: ${error.message}`)
  }

  // The deployments endpoint has no sort param. Check every page and keep
  // the highest deployment number.
  let latest = null
  try {
    for await (const d of cf.getAPIList(
      `${base}/${preview.id}/deployments`,
      V4PagePaginationArray
    )) {
      if (commitHash && d.annotations?.['workers/commit_sha'] !== commitHash) {
        continue
      }
      if (!latest || d.number > latest.number) {
        latest = d
      }
    }
  } catch (error) {
    throw new Error(
      `Error fetching Worker Preview deployments: ${error.message}`
    )
  }

  if (!latest) {
    core.info(
      commitHash
        ? `No deployment of Preview ${preview.name} for commit ${commitHash} yet`
        : `Preview ${preview.name} has no deployments yet`
    )
    return null
  }

  const result = {
    id: latest.id,
    url: latest.urls?.[0],
    branchUrl: preview.urls?.[0]
  }
  core.info(`Preview URL: ${result.url} (deployment #${latest.number})`)

  return result
}

'use strict'

import * as core from '@actions/core'
import { V4PagePaginationArray } from 'cloudflare/pagination'
import createCloudflareClient from './cloudflare-client.js'

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

  let preview
  try {
    const response = await cf.get(`${base}/${encodeURIComponent(branch)}`)
    preview = response.result
  } catch (error) {
    if (error.status === 404) {
      core.info(`No Worker Preview named ${branch} on ${workerName} yet`)
      return null
    }
    throw new Error(`Error fetching Worker Preview: ${error.message}`, {
      cause: error
    })
  }

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
      `Error fetching Worker Preview deployments: ${error.message}`,
      { cause: error }
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

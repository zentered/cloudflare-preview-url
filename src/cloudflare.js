'use strict'

import core from '@actions/core'
import createCloudflareClient from './cloudflare-client.js'

// Values the deployments list endpoint accepts in its `env` query param.
const API_ENVIRONMENTS = ['preview', 'production']

// Stop searching after this many deployments. The list is newest first and
// the API returns 25 per page, so this is about 10 requests. A preview for a
// live branch is near the top. Without a bound, a branch that has no
// deployment would page through the whole project history.
const MAX_DEPLOYMENTS_CHECKED = 250

function matchesDeployment(d, repo, branch, environment, commitHash) {
  if (!d) {
    return false
  }

  // Direct uploads (wrangler pages deploy) and deploy hooks can have no git
  // source. Check the repo only when the deployment names one.
  const repoName = d.source?.config?.repo_name
  if (repoName && repoName !== repo) {
    return false
  }

  const metadata = d.deployment_trigger?.metadata
  if (!metadata || metadata.branch !== branch) {
    return false
  }

  if (environment && environment.length > 0 && d.environment !== environment) {
    return false
  }

  if (commitHash && metadata.commit_hash !== commitHash) {
    return false
  }

  return true
}

export default async function getDeploymentUrl(
  token,
  accountId,
  accountEmail,
  projectId,
  repo,
  branch,
  environment,
  commitHash
) {
  if (commitHash) {
    core.info(`Fetching deployments for commit ${commitHash}`)
  } else {
    core.info(`Fetching deployments for project ${projectId}`)
  }

  const cf = createCloudflareClient(token, accountEmail)

  const params = { account_id: accountId }
  if (API_ENVIRONMENTS.includes(environment)) {
    params.env = environment
  }

  try {
    core.debug(`Looking for matching deployments ${repo}/${branch}`)

    // The list is paginated. Iterating the SDK result fetches the next page
    // on demand and stops at the first match or at the deployment cap.
    let checked = 0
    let build = null
    for await (const d of cf.pages.projects.deployments.list(
      projectId,
      params
    )) {
      checked++
      if (matchesDeployment(d, repo, branch, environment, commitHash)) {
        build = d
        break
      }
      if (checked >= MAX_DEPLOYMENTS_CHECKED) {
        core.info(
          `Search bounded: checked the newest ${checked} deployments without a match. Older deployments were not checked.`
        )
        break
      }
    }

    if (checked === 0) {
      core.error('No deployments found')
      core.setFailed('no deployments found')
      throw new Error('no deployments found')
    }

    core.info(`Checked ${checked} deployments`)

    if (!build) {
      core.info(
        'If you run this as a pull request check, make sure to include the branch in the trigger (see #Usage in README.md)'
      )
      core.setFailed('no matching builds found')
      throw new Error('no matching builds found')
    }

    core.info(
      `Preview URL: ${build.url} (${build.latest_stage.name} - ${build.latest_stage.status})`
    )

    return build
  } catch (error) {
    core.error('Error fetching deployments from Cloudflare API')
    core.error(error.message)
    core.setFailed('error fetching deployments')
    throw new Error(`Error fetching deployments: ${error.message}`)
  }
}

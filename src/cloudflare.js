'use strict'

import core from '@actions/core'
import createCloudflareClient from './cloudflare-client.js'

// Values the deployments list endpoint accepts in its `env` query param.
const API_ENVIRONMENTS = ['preview', 'production']

function matchesDeployment(d, repo, branch, environment, commitHash) {
  if (
    !d ||
    !d.source ||
    !d.source.config ||
    d.source.config.repo_name !== repo
  ) {
    return false
  }

  if (
    !d.deployment_trigger ||
    d.deployment_trigger.metadata.branch !== branch
  ) {
    return false
  }

  if (environment && environment.length > 0 && d.environment !== environment) {
    return false
  }

  if (
    commitHash &&
    (d.deployment_trigger.metadata === null ||
      d.deployment_trigger.metadata.commit_hash !== commitHash)
  ) {
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
    // on demand and stops as soon as a match is found.
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

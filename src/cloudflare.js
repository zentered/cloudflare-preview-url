'use strict'

import core from '@actions/core'
import createCloudflareClient from './cloudflare-client.js'

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

  try {
    const response = await cf.pages.projects.deployments.list(projectId, {
      account_id: accountId
    })

    if (!response.result || response.result.length <= 0) {
      core.error('No deployments found')
      core.setFailed('no deployments found')
      throw new Error('no deployments found')
    }

    const result = response.result

    core.info(`Found ${result.length} deployments`)
    core.debug(`Looking for matching deployments ${repo}/${branch}`)

    const builds = result
      .filter(
        (d) =>
          d && d.source && d.source.config && d.source.config.repo_name === repo
      )
      .filter(
        (d) =>
          d &&
          d.deployment_trigger &&
          d.deployment_trigger.metadata.branch === branch
      )
      .filter((d) => {
        if (environment && environment.length > 0) {
          return d.environment === environment
        } else {
          return true
        }
      })
      .filter(
        (d) =>
          !commitHash ||
          (d.deployment_trigger.metadata !== null &&
            d.deployment_trigger.metadata.commit_hash === commitHash)
      )

    core.info(`Found ${builds.length} matching builds`)
    if (!builds || builds.length <= 0) {
      core.error(JSON.stringify(builds))
      core.info(
        'If you run this as a pull request check, make sure to include the branch in the trigger (see #Usage in README.md)'
      )
      core.setFailed('no matching builds found')
      throw new Error('no matching builds found')
    }

    const build = builds[0]
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

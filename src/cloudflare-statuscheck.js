'use strict'

import * as core from '@actions/core'
import createCloudflareClient from './cloudflare-client.js'

export default async function waitForDeployment(
  token,
  accountId,
  accountEmail,
  projectId,
  deploymentId
) {
  core.info(`Checking deployment status for ID: ${deploymentId} ...`)

  const cf = createCloudflareClient(token, accountEmail)

  try {
    const build = await cf.pages.projects.deployments.get(deploymentId, {
      account_id: accountId,
      project_name: projectId
    })

    core.debug('Deployment status response:')
    core.debug(JSON.stringify(build))

    if (!build || !build.latest_stage) {
      core.error('Invalid API response: missing deployment')
      core.setFailed('no build with this ID found.')
      throw new Error('No build id. Abort.')
    }

    core.info(
      `Deployment status (#${build.short_id}) ${build.latest_stage.name}: ${build.latest_stage.status}`
    )

    if (build.latest_stage.status === 'failure') {
      core.setFailed(`${build.latest_stage.name}: ${build.latest_stage.status}`)
      throw new Error('Build failed. Abort.')
    }

    return (
      build.latest_stage.name === 'deploy' &&
      build.latest_stage.status === 'success'
    )
  } catch (error) {
    core.error('Error fetching deployment status from Cloudflare API')
    core.error(error.message)
    core.setFailed('Failed to fetch deployment status')
    throw new Error(`Failed to fetch deployment status: ${error.message}`, {
      cause: error
    })
  }
}

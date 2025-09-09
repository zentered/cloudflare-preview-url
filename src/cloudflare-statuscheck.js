'use strict'

import core from '@actions/core'

export default async function waitForDeployment(
  token,
  accountId,
  accountEmail,
  projectId,
  deploymentId
) {
  core.info(`Checking deployment status for ID: ${deploymentId} ...`)
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectId}/deployments`
  const headers = accountEmail
    ? {
        'X-Auth-Key': token,
        'X-Auth-Email': accountEmail
      }
    : {
        Authorization: `Bearer ${token}`
      }

  const res = await fetch(apiUrl, {
    headers
  })
  if (!res.ok) {
    core.error(res)
    core.setFailed(
      `Failed to fetch deployment status: ${res ? res.statusText : 'No response'}`
    )
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  const { data } = await res.json()
  core.debug('Deployment status response:')
  core.debug(JSON.stringify(data))

  if (!data || !data.result) {
    core.error('Invalid API response: missing data.result')
    core.error(JSON.stringify(data))
    core.setFailed('API response does not contain expected data structure')
    throw new Error('Invalid API response. Abort.')
  }

  const build = data.result.filter((d) => d.id === deploymentId)[0]

  core.info(
    `Deployment status (#${build.short_id}) ${build.latest_stage.name}: ${build.latest_stage.status}`
  )

  if (!build) {
    core.error(data)
    core.setFailed('no build with this ID found.')
    throw new Error('No build id. Abort.')
  }

  if (build.latest_stage.status === 'failure') {
    core.setFailed(`${build.latest_stage.name}: ${build.latest_stage.status}`)
    throw new Error('Build failed. Abort.')
  }

  return (
    build.latest_stage.name === 'deploy' &&
    build.latest_stage.status === 'success'
  )
}

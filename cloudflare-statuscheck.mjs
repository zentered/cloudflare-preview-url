import core from '@actions/core'
import axios from 'axios'

export default async function waitForDeployment(
  token,
  accountId,
  accountEmail,
  projectId,
  deploymentId
) {
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectId}/deployments`
  
  const headers = accountEmail ? {
    'X-Auth-Key': token,
    'X-Auth-Email': accountEmail
  } : {
    Authorization: `Bearer ${token}`,
  };

  const { data } = await axios.get(apiUrl, {
    headers,
    responseType: 'json',
    responseEncoding: 'utf8'
  })

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

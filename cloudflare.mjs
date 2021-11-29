import core from '@actions/core'
import axios from 'axios'

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
  const apiUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectId}/deployments`

  if (commitHash) {
    core.info(`Fetching ${commitHash} from: ${apiUrl}`)
  } else {
    core.info(`Fetching from: ${apiUrl}`)
  }

  const { data } = await axios.get(apiUrl, {
    headers: {
      'X-Auth-Key': token,
      'X-Auth-Email': accountEmail
    },
    responseType: 'json',
    responseEncoding: 'utf8'
  })

  if (!data || !data.result || data.result.length <= 0) {
    core.error(JSON.stringify(data))
    throw new Error('no deployments found')
  }

  core.info(`Found ${data.result.length} deployments`)
  core.debug(`Looking for matching deployments ${repo}/${branch}`)

  const builds = data.result
    .map((d) => {
      core.info('-- temporary debugging --')
      core.info(
        `repo: ${d.source.config.repo_name}, ${repo}, ${
          d.source.config.repo_name === repo
        }`
      )
      core.info(
        `branch: ${d.deployment_trigger.metadata.branch}, ${branch}, ${
          d.deployment_trigger.metadata.branch === branch
        }`
      )
      core.info(
        `environment: ${environment}, ${d.environment}, ${
          d.environment === environment
        }`
      )
      core.info(
        `sha: ${commitHash}, ${d.deployment_trigger.metadata.commit_hash}`
      )
      return d
    })
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
        commitHash === null ||
        (d.deployment_trigger.metadata !== null &&
          d.deployment_trigger.metadata.commit_hash === commitHash)
    )

  core.info(`Found ${builds.length} matching builds`)
  if (!builds || builds.length <= 0) {
    core.error(JSON.stringify(builds))
    throw new Error('no matching builds found')
  }

  const build = builds[0]
  core.info(
    `Preview URL: ${build.url} (${build.latest_stage.name} - ${build.latest_stage.status})`
  )

  return build
}

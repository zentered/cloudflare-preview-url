import core from '@actions/core'
import getDeploymentUrl from './cloudflare.mjs'
import checkDeploymentStatus from './cloudflare-statuscheck.mjs'

async function delay(ms) {
  return await new Promise(resolve => setTimeout(resolve, ms))
}

async function run() {
  try {
    const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN
    const githubRef =
      core.getInput('branch', { required: false }) || process.env.GITHUB_REF
    const githubProject = process.env.GITHUB_REPOSITORY
    const githubBranch = githubRef.replace('refs/heads/', '')
    const githubRepo = githubProject.split('/')[1]
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accountEmail = process.env.CLOUDFLARE_ACCOUNT_EMAIL
    const projectId = core.getInput('cloudflare_project_id')
    const waitForDeploymentReady = core.getInput('wait_until_ready')
    const environment = core.getInput('environment', { required: false })
    const inputHash = core.getInput('commit_hash', { required: false })
    const commitHash = inputHash === '' || inputHash === null ? null : inputHash

    core.info(
      `Retrieving deployment preview for ${githubRepo}/${githubBranch} ...`
    )

    const { id, url } = await getDeploymentUrl(
      cloudflareToken,
      accountId,
      accountEmail,
      projectId,
      githubRepo,
      githubBranch,
      environment,
      commitHash
    )

    if (waitForDeploymentReady === 'true') {
      let deploymentReady = false

      while (!deploymentReady) {
        deploymentReady = await checkDeploymentStatus(
          cloudflareToken,
          accountId,
          accountEmail,
          projectId,
          id
        )

        if (!deploymentReady) {
          await delay(2000)
        }
      }
    }

    core.setOutput('preview_url', url)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

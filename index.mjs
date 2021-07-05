import core from '@actions/core'
import getDeploymentUrl from './cloudflare.mjs'

async function run() {
  try {
    const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN
    const githubRef = process.env.GITHUB_REF
    const githubProject = process.env.GITHUB_REPOSITORY
    const githubBranch = githubRef.replace('refs/heads/', '')
    const githubRepo = githubProject.split('/')[1]
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const accountEmail = process.env.CLOUDFLARE_ACCOUNT_EMAIL
    const projectId = core.getInput('cloudflare_project_id')

    core.info(
      `Retrieving deployment preview for ${githubRepo}/${githubBranch} ...`
    )

    const { url } = await getDeploymentUrl(
      cloudflareToken,
      accountId,
      accountEmail,
      projectId,
      githubRepo,
      githubBranch
    )

    core.setOutput('preview_url', url)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

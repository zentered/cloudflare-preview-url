'use strict'

import * as core from '@actions/core'
import getDeploymentUrl from './cloudflare.js'
import checkDeploymentStatus from './cloudflare-statuscheck.js'
import getWorkerPreviewUrl from './cloudflare-workers.js'

async function delay(ms) {
  return await new Promise((resolve) => setTimeout(resolve, ms))
}

async function runPages(options) {
  const {
    cloudflareToken,
    accountId,
    accountEmail,
    projectId,
    githubRepo,
    githubBranch,
    environment,
    commitHash,
    waitForDeploymentReady
  } = options

  const { id, url, aliases } = await getDeploymentUrl(
    cloudflareToken,
    accountId,
    accountEmail,
    projectId,
    githubRepo,
    githubBranch,
    environment,
    commitHash
  )

  if (waitForDeploymentReady) {
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
  if (aliases && aliases.length > 0) {
    core.setOutput('branch_url', aliases[0])
  }
}

async function runWorkers(options) {
  const {
    cloudflareToken,
    accountId,
    accountEmail,
    workerName,
    githubBranch,
    commitHash,
    waitForDeploymentReady
  } = options

  let preview = null
  while (!preview) {
    preview = await getWorkerPreviewUrl(
      cloudflareToken,
      accountId,
      accountEmail,
      workerName,
      githubBranch,
      commitHash
    )

    if (!preview) {
      if (!waitForDeploymentReady) {
        throw new Error(
          `No Worker Preview found for ${workerName}/${githubBranch}. Set wait_until_ready: true to wait for it.`
        )
      }
      await delay(5000)
    }
  }

  if (!preview.url) {
    throw new Error(
      'The Preview deployment has no URL. Check that Preview URLs are enabled for the Worker.'
    )
  }

  core.setOutput('preview_url', preview.url)
  if (preview.branchUrl) {
    core.setOutput('branch_url', preview.branchUrl)
  }
}

async function run() {
  try {
    const githubRef =
      core.getInput('branch', { required: false }) || process.env.GITHUB_REF
    const githubProject = process.env.GITHUB_REPOSITORY
    const inputHash = core.getInput('commit_hash', { required: false })
    const projectId = core.getInput('cloudflare_project_id')
    const workerName = core.getInput('cloudflare_worker_name')

    if (!projectId === !workerName) {
      throw new Error(
        'Set exactly one of cloudflare_project_id (Pages) or cloudflare_worker_name (Workers).'
      )
    }

    const options = {
      cloudflareToken: process.env.CLOUDFLARE_API_TOKEN,
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      accountEmail: process.env.CLOUDFLARE_ACCOUNT_EMAIL,
      projectId,
      workerName,
      githubRepo: githubProject.split('/')[1],
      githubBranch: githubRef.replace('refs/heads/', ''),
      environment: core.getInput('environment', { required: false }),
      commitHash: inputHash === '' || inputHash === null ? null : inputHash,
      waitForDeploymentReady: core.getInput('wait_until_ready') === 'true'
    }

    core.info(
      `Retrieving deployment preview for ${options.githubRepo}/${options.githubBranch} ...`
    )

    if (workerName) {
      await runWorkers(options)
    } else {
      await runPages(options)
    }
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()

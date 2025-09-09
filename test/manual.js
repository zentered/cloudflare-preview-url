'use strict'

import getDeploymentUrl from '../src/cloudflare.js'
import waitForDeployment from '../src/cloudflare-statuscheck.js'

// Variables for required inputs
const token = process.env.CLOUDFLARE_TOKEN
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
const accountEmail = process.env.CLOUDFLARE_ACCOUNT_EMAIL
const projectId = process.env.CLOUDFLARE_PROJECT_ID
const repo = process.env.REPO_NAME || 'your-repo-name'
const branch = process.env.BRANCH_NAME || 'main'
const environment = process.env.ENVIRONMENT || 'production'
const commitHash = process.env.COMMIT_HASH || ''

async function runManualTests() {
  console.log('Starting manual e2e tests...')

  try {
    // Test getDeploymentUrl function
    console.log('\n--- Testing getDeploymentUrl ---')
    const deployment = await getDeploymentUrl(
      token,
      accountId,
      accountEmail,
      projectId,
      repo,
      branch,
      environment,
      commitHash
    )

    console.log('Deployment found:', {
      id: deployment.id,
      url: deployment.url,
      status: deployment.latest_stage.status,
      stage: deployment.latest_stage.name
    })

    // Test waitForDeployment function using the deployment from getDeploymentUrl
    console.log('\n--- Testing waitForDeployment ---')
    const isReady = await waitForDeployment(
      token,
      accountId,
      accountEmail,
      projectId,
      deployment.id
    )

    console.log('Deployment ready:', isReady)

    console.log('\n✅ Manual tests completed successfully!')
  } catch (error) {
    console.error('\n❌ Manual tests failed:', error.message)
    process.exit(1)
  }
}

runManualTests()

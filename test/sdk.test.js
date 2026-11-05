'use strict'

// Runs the real Cloudflare SDK against a local HTTP server to check the
// request paths, query params and pagination the action relies on.

import assert from 'node:assert'
import { createServer } from 'node:http'
import { after, before, test } from 'node:test'
import getDeploymentUrl from '../src/cloudflare.js'
import waitForDeployment from '../src/cloudflare-statuscheck.js'

function deployment(n, branch) {
  return {
    id: `id-${n}`,
    url: `https://${n}.cf-project.pages.dev`,
    environment: 'preview',
    deployment_trigger: { type: 'github:push', metadata: { branch } },
    latest_stage: { name: 'deploy', status: 'success' },
    source: { type: 'github', config: { repo_name: 'website' } }
  }
}

// Page 1 holds only other branches. The target branch is on page 2.
const pages = {
  1: Array.from({ length: 25 }, (_, i) => deployment(i, `other-${i}`)),
  2: [deployment(25, 'feat/old-branch'), deployment(26, 'other-26')],
  3: []
}

const requests = []
let server
// When set, every page is full of non-matching deployments.
let endless = false

before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    requests.push(url)
    res.setHeader('content-type', 'application/json')
    const single = url.pathname.match(/\/deployments\/([^/]+)$/)
    if (single) {
      res.end(
        JSON.stringify({
          success: true,
          errors: [],
          messages: [],
          result: { ...deployment(25, 'feat/old-branch'), id: single[1] }
        })
      )
      return
    }
    const page = Number(url.searchParams.get('page') || 1)
    if (endless) {
      pages[page] = Array.from({ length: 25 }, (_, i) =>
        deployment(page * 25 + i, `other-${page}-${i}`)
      )
    }
    res.end(
      JSON.stringify({
        success: true,
        errors: [],
        messages: [],
        result: pages[page] || [],
        result_info: { page, per_page: 25, count: (pages[page] || []).length }
      })
    )
  })
  await new Promise((resolve) => server.listen(0, resolve))
  process.env.CLOUDFLARE_BASE_URL = `http://localhost:${server.address().port}`
})

after(() => {
  delete process.env.CLOUDFLARE_BASE_URL
  server.close()
})

test('getDeploymentUrl() finds a deployment on the second page', async () => {
  const build = await getDeploymentUrl(
    'token',
    'account',
    undefined,
    'cf-project',
    'website',
    'feat/old-branch',
    'preview',
    null
  )

  assert.equal(build.url, 'https://25.cf-project.pages.dev')
  // Stops after the page with the match. Page 3 is never requested.
  assert.deepEqual(
    requests.map((u) => u.searchParams.get('page')),
    [null, '2']
  )
  assert.ok(
    requests.every((u) => u.searchParams.get('env') === 'preview'),
    'env query param is sent on every page'
  )
  assert.equal(
    requests[0].pathname,
    '/accounts/account/pages/projects/cf-project/deployments'
  )
})

test('getDeploymentUrl() stops after the deployment cap when nothing matches', async () => {
  requests.length = 0
  endless = true

  try {
    await assert.rejects(
      getDeploymentUrl(
        'token',
        'account',
        undefined,
        'cf-project',
        'website',
        'no-such-branch',
        'preview',
        null
      ),
      {
        message: 'Error fetching deployments: no matching builds found'
      }
    )
  } finally {
    endless = false
    // core.setFailed() sets the exit code. Clear it so the file passes.
    process.exitCode = 0
  }

  // 250 deployments at 25 per page is 10 requests.
  assert.equal(requests.length, 10)
})

test('waitForDeployment() fetches the deployment by id', async () => {
  requests.length = 0

  const ready = await waitForDeployment(
    'token',
    'account',
    undefined,
    'cf-project',
    'id-25'
  )

  assert.equal(ready, true)
  assert.equal(requests.length, 1)
  assert.equal(
    requests[0].pathname,
    '/accounts/account/pages/projects/cf-project/deployments/id-25'
  )
})

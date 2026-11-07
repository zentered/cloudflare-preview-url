'use strict'

import assert from 'node:assert'
import { createServer } from 'node:http'
import { after, before, beforeEach, test } from 'node:test'
import getWorkerPreviewUrl from '../src/cloudflare-workers.js'

const base = '/accounts/account/workers/workers/my-worker/previews'

const preview = {
  id: 'p1',
  name: 'feat/login',
  slug: 'feat-login',
  urls: ['https://feat-login-my-worker.acme.workers.dev']
}

function deployment(number, sha) {
  return {
    id: `d${number}`,
    number,
    annotations: { 'workers/commit_sha': sha },
    urls: [`https://d${number}-my-worker.acme.workers.dev`]
  }
}

const deploymentPages = {
  1: [deployment(2, 'bbb'), deployment(1, 'aaa')],
  2: [deployment(3, 'ccc')]
}

const requests = []
let server

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(body))
}

before(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    requests.push(url.pathname + url.search)

    if (!url.pathname.startsWith('/accounts/account/')) {
      return send(res, 403, {
        success: false,
        errors: [{ code: 10000, message: 'Authentication error' }],
        messages: [],
        result: null
      })
    }

    if (url.pathname === `${base}/${encodeURIComponent('feat/login')}`) {
      return send(res, 200, {
        success: true,
        errors: [],
        messages: [],
        result: preview
      })
    }

    if (url.pathname === `${base}/p1/deployments`) {
      const page = Number(url.searchParams.get('page') || 1)
      return send(res, 200, {
        success: true,
        errors: [],
        messages: [],
        result: deploymentPages[page] || []
      })
    }

    send(res, 404, {
      success: false,
      errors: [{ code: 10000, message: 'Preview not found' }],
      messages: [],
      result: null
    })
  })
  await new Promise((resolve) => server.listen(0, resolve))
  process.env.CLOUDFLARE_BASE_URL = `http://localhost:${server.address().port}`
})

beforeEach(() => {
  requests.length = 0
})

after(() => {
  delete process.env.CLOUDFLARE_BASE_URL
  server.close()
})

test('getWorkerPreviewUrl() returns the latest deployment of the branch Preview', async () => {
  const result = await getWorkerPreviewUrl(
    'token',
    'account',
    undefined,
    'my-worker',
    'feat/login',
    null
  )

  assert.deepEqual(result, {
    id: 'd3',
    url: 'https://d3-my-worker.acme.workers.dev',
    branchUrl: 'https://feat-login-my-worker.acme.workers.dev'
  })
  assert.equal(requests[0], `${base}/feat%2Flogin`)
  assert.ok(requests.includes(`${base}/p1/deployments?page=2`))
})

test('getWorkerPreviewUrl() filters deployments by commit', async () => {
  const result = await getWorkerPreviewUrl(
    'token',
    'account',
    undefined,
    'my-worker',
    'feat/login',
    'aaa'
  )

  assert.equal(result.url, 'https://d1-my-worker.acme.workers.dev')
})

test('getWorkerPreviewUrl() returns null when no deployment matches the commit', async () => {
  const result = await getWorkerPreviewUrl(
    'token',
    'account',
    undefined,
    'my-worker',
    'feat/login',
    'zzz'
  )

  assert.equal(result, null)
})

test('getWorkerPreviewUrl() returns null when the Preview does not exist', async () => {
  const result = await getWorkerPreviewUrl(
    'token',
    'account',
    undefined,
    'my-worker',
    'feat/unknown',
    null
  )

  assert.equal(result, null)
  assert.equal(requests.length, 1)
})

test('getWorkerPreviewUrl() throws on other API errors', async () => {
  await assert.rejects(
    getWorkerPreviewUrl(
      'token',
      'wrong-account',
      undefined,
      'my-worker',
      'feat/login',
      null
    ),
    /Error fetching Worker Preview/
  )
})
